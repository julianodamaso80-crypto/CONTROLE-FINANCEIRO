import { exec, queryOne } from '../db/pg.js';
import { complete, extractJsonBlock } from '../integrations/llm.js';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import { startAgentRun, finishAgentRun } from '../db/repositories/agent-runs.js';
import { detectForbiddenPhrases } from '../lib/scope-guard.js';
import { countWords } from '../lib/mdx.js';
import type { ReviewStatus } from './_types.js';

interface DeterministicChecks {
  word_count: number;
  word_count_ok: boolean;
  cta_count: number;
  cta_ok: boolean;
  internal_links_count: number;
  internal_links_ok: boolean;
  source_citations: number;
  source_citations_ok: boolean;
  forbidden_findings: { reason: string; match: string }[];
  has_tldr: boolean;
  has_fontes: boolean;
  has_em_resumo: boolean;
  has_faq: boolean;
}

interface LlmJudgeOutput {
  decision: ReviewStatus;
  reasons: string[];
}

function deterministicChecks(body: string): DeterministicChecks {
  const wordCount = countWords(body);
  // Contamos APENAS links pra /register (CTAs do MeuCaixa apontam pra essa URL)
  const ctaLinks = body.match(/\]\(\/register(?:[)/?#]|$)/gi) || [];
  const ctaCount = ctaLinks.length;
  const internalLinks = body.match(/\]\(\/blog\/[a-z0-9-]+\)/gi) || [];
  const sourceCitations = (body.match(/\b(segundo|de acordo com|conforme)\s+(o|a|os|as|d[oa])\s+[A-ZÁ-Ú]/g) || []).length;
  const findings = detectForbiddenPhrases(body);

  return {
    word_count: wordCount,
    word_count_ok: wordCount >= config.WORDS_PER_ARTICLE_MIN && wordCount <= config.WORDS_PER_ARTICLE_MAX + 200,
    cta_count: ctaCount,
    cta_ok: ctaCount >= 3,
    internal_links_count: internalLinks.length,
    internal_links_ok: internalLinks.length >= 3,
    source_citations,
    source_citations_ok: sourceCitations >= 3,
    forbidden_findings: findings,
    has_tldr: /\bTL;DR\b/i.test(body) || /^[^\n#]{40,}/.test(body.trim()),
    has_fontes: /## *Fontes\s+consultadas/i.test(body),
    has_em_resumo: /## *Em\s+resumo/i.test(body),
    has_faq: /## *(Perguntas\s+frequentes|FAQ)/i.test(body),
  };
}

const LLM_JUDGE_SYSTEM = `Você é o revisor editorial sênior do blog do Meu Caixa.
Sua tarefa: avaliar se o artigo está pronto pra publicar.

Critérios:
- Tom prático, sem jargão exagerado
- Sem promessa milagrosa, "fique rico", "rendimento garantido"
- Mantém escopo (finanças pessoais, controle de gastos, orçamento, WhatsApp financeiro, educação financeira básica)
- Sem recomendação de ação específica, day trade, cripto especulativa
- Cita fontes oficiais quando faz afirmação numérica
- Linka pra outros artigos do blog

Retorne JSON: { decision: "APROVADO" | "APROVADO_COM_AJUSTES" | "REPROVADO", reasons: ["..."] }`;

export async function runLegalReviewer(articleId: string): Promise<{
  status: ReviewStatus;
  notes: string;
}> {
  const runId = await startAgentRun({ agent_id: '06-legal-reviewer', triggered_by: 'pipeline', input: { articleId } });

  const article = await queryOne<{ id: string; title: string; mdx_content: string }>(
    `SELECT id, title, mdx_content FROM seo.articles WHERE id = $1`,
    [articleId],
  );
  if (!article) {
    await finishAgentRun({ run_id: runId, error: 'article not found' });
    return { status: 'REPROVADO', notes: 'article not found' };
  }

  const body = article.mdx_content;
  const checks = deterministicChecks(body);

  if (checks.forbidden_findings.length > 0) {
    const notes = `REPROVADO (regex): ${checks.forbidden_findings.map((f) => `${f.reason} ["${f.match}"]`).join('; ')}`;
    await exec(
      `UPDATE seo.articles SET review_status='REPROVADO', review_notes=$1, status='in_review' WHERE id=$2`,
      [notes, articleId],
    );
    await finishAgentRun({ run_id: runId, output: { status: 'REPROVADO', notes } });
    return { status: 'REPROVADO', notes };
  }

  const hardFails: string[] = [];
  if (!checks.word_count_ok) hardFails.push(`word_count=${checks.word_count} fora da faixa ${config.WORDS_PER_ARTICLE_MIN}-${config.WORDS_PER_ARTICLE_MAX + 200}`);
  if (!checks.cta_ok) hardFails.push(`cta_count=${checks.cta_count} (mínimo 2)`);
  if (!checks.internal_links_ok) hardFails.push(`internal_links=${checks.internal_links_count} (mínimo 3)`);
  if (!checks.source_citations_ok) hardFails.push(`source_citations=${checks.source_citations} (mínimo 3)`);
  if (!checks.has_fontes) hardFails.push('seção "## Fontes consultadas" ausente');
  if (!checks.has_em_resumo) hardFails.push('seção "## Em resumo" ausente');
  if (!checks.has_faq) hardFails.push('seção FAQ ausente');

  if (hardFails.length > 0) {
    const status: ReviewStatus = 'APROVADO_COM_AJUSTES';
    const notes = `Avisos: ${hardFails.join('; ')}`;
    await exec(
      `UPDATE seo.articles SET review_status=$1, review_notes=$2, status='in_review' WHERE id=$3`,
      [status, notes, articleId],
    );
    await finishAgentRun({ run_id: runId, output: { status, notes, checks } });
    logger.info({ articleId, hardFails }, '[06-reviewer] approved with warnings');
    return { status, notes };
  }

  let llmDecision: LlmJudgeOutput = { decision: 'APROVADO', reasons: ['passou guards determinísticos'] };
  try {
    const llmResult = await complete({
      tier: 'light',
      system: LLM_JUDGE_SYSTEM,
      messages: [{ role: 'user', content: `Título: ${article.title}\n\nCorpo:\n${body.slice(0, 8000)}` }],
      max_tokens: 600,
      temperature: 0.2,
    });
    llmDecision = extractJsonBlock(llmResult.text) as LlmJudgeOutput;
  } catch (err) {
    logger.warn({ err, articleId }, '[06-reviewer] LLM judge failed, defaulting to APROVADO');
  }

  const finalStatus = llmDecision.decision ?? 'APROVADO';
  const finalNotes = `LLM: ${(llmDecision.reasons ?? []).join('; ')}`;

  await exec(
    `UPDATE seo.articles SET review_status=$1, review_notes=$2, status='in_review' WHERE id=$3`,
    [finalStatus, finalNotes, articleId],
  );
  await finishAgentRun({ run_id: runId, output: { status: finalStatus, notes: finalNotes, checks } });
  return { status: finalStatus, notes: finalNotes };
}
