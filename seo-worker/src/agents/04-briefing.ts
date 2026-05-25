import { exec, query, queryOne } from '../db/pg.js';
import { complete, extractJsonBlock } from '../integrations/llm.js';
import { config, resolveLlmModel } from '../config.js';
import { logger } from '../lib/logger.js';
import { startAgentRun, finishAgentRun } from '../db/repositories/agent-runs.js';
import type { BriefingFaq, BriefingInternalLink, BriefingOutlineItem } from './_types.js';

interface BriefingOutput {
  seo_title: string;
  h1: string;
  outline: BriefingOutlineItem[];
  faqs: BriefingFaq[];
  internal_links: BriefingInternalLink[];
  legal_notes?: string;
  example_suggestions?: string;
  image_suggestion?: string;
}

const SYSTEM = `Você é um editor sênior do Meu Caixa criando briefings de artigos de blog.

Cada briefing deve seguir esse molde rigoroso:
- seo_title: 50-65 caracteres, com keyword principal natural
- h1: curto e magnético, até 60 caracteres
- outline: 5 H2s no formato PERGUNTA (ex: "Como criar orçamento familiar?"), cada um com 2-3 H3s e notas
- faqs: 3 perguntas frequentes com respostas de 30-50 palavras
- internal_links: 3-5 links sugeridos pra artigos relacionados (slug interno /blog/{slug})
- legal_notes: ressalvas e disclaimers necessários (ex: "rendimentos passados não garantem futuros")
- example_suggestions: 2-3 exemplos práticos que o writer pode usar
- image_suggestion: descrição curta da capa em português

ESCOPO PERMITIDO: controle de gastos pessoais, orçamento familiar, WhatsApp/IA financeira, educação financeira básica.
NUNCA: day trade, ações específicas, cripto especulativa, MLM, "fique rico rápido".

Retorne só o JSON conforme o molde.`;

export async function runBriefing(opts: { topic_ids: string[] }): Promise<string[]> {
  const runId = await startAgentRun({ agent_id: '04-briefing', triggered_by: 'pipeline', input: opts });
  const briefingIds: string[] = [];

  const topics = await query<{
    id: string;
    title: string;
    category: string;
    funnel_stage: string;
    audience: string | null;
    pain_point: string | null;
    cluster_id: string | null;
  }>(
    `SELECT id, title, category, funnel_stage, audience, pain_point, cluster_id
       FROM seo.topics
      WHERE id = ANY($1) AND decision = 'APROVAR_ARTIGO_NOVO'`,
    [opts.topic_ids],
  );

  for (const topic of topics) {
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM seo.briefings WHERE topic_id = $1`,
      [topic.id],
    );
    if (existing) {
      briefingIds.push(existing.id);
      continue;
    }

    const userPrompt = `Tópico: "${topic.title}"
Categoria: ${topic.category}
Funil: ${topic.funnel_stage ?? 'top'}
Público-alvo: ${topic.audience ?? 'pessoas físicas brasileiras que querem organizar gastos'}
Dor principal: ${topic.pain_point ?? 'não sabe pra onde vai o dinheiro'}

Gere o briefing JSON completo.`;

    try {
      const result = await complete({
        tier: 'main',
        system: SYSTEM,
        messages: [{ role: 'user', content: userPrompt }],
        max_tokens: 1800,
        temperature: 0.4,
      });

      const parsed = extractJsonBlock(result.text) as BriefingOutput;
      const llmModel = resolveLlmModel('main').model;

      const row = await queryOne<{ id: string }>(
        `INSERT INTO seo.briefings (topic_id, seo_title, h1, outline, faqs, internal_links, legal_notes, example_suggestions, image_suggestion, llm_model_used)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          topic.id,
          parsed.seo_title?.slice(0, 80) ?? topic.title.slice(0, 65),
          parsed.h1?.slice(0, 80) ?? topic.title,
          JSON.stringify(parsed.outline ?? []),
          JSON.stringify(parsed.faqs ?? []),
          JSON.stringify(parsed.internal_links ?? []),
          parsed.legal_notes ?? null,
          parsed.example_suggestions ?? null,
          parsed.image_suggestion ?? null,
          llmModel,
        ],
      );

      if (row) briefingIds.push(row.id);
    } catch (err) {
      logger.warn({ err, topicId: topic.id }, '[04-briefing] failed for topic');
      await exec(
        `UPDATE seo.topics SET decision='REJEITAR_FORA_DO_ESCOPO', decision_reason=$1 WHERE id=$2`,
        ['briefing generation failed', topic.id],
      );
    }
  }

  await finishAgentRun({ run_id: runId, output: { briefingIds: briefingIds.length } });
  void config;
  return briefingIds;
}
