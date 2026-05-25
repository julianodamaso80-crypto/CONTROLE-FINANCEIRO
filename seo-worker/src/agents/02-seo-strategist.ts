import { config } from '../config.js';
import { exec, query, queryOne } from '../db/pg.js';
import { complete, extractJsonBlock } from '../integrations/llm.js';
import { logger } from '../lib/logger.js';
import { startAgentRun, finishAgentRun } from '../db/repositories/agent-runs.js';
import { checkRepetition } from './03-anti-repetition.js';
import { isInScope } from '../lib/scope-guard.js';
import type { ClusterRow, KeywordRow, FunnelStage, StrategistDecision } from './_types.js';

interface StrategistOutput {
  decision: StrategistDecision;
  title: string;
  cluster_slug?: string;
  funnel_stage?: FunnelStage;
  audience?: string;
  pain_point?: string;
  reason?: string;
}

const SYSTEM = `Você é um estrategista de SEO sênior do blog do Meu Caixa (controle financeiro pessoal via WhatsApp, público brasileiro).

ESCOPO PERMITIDO:
- Controle de gastos pessoais (despesas, planilhas, apps, métodos)
- Orçamento familiar e planejamento mensal (50/30/20, envelopes, economia doméstica)
- WhatsApp e automação financeira (IA, bots, registros automáticos)
- Educação financeira básica (score, IR, cadastro positivo, dívidas, juros)

ESCOPO PROIBIDO:
- Day trade ou trading especulativo
- Recomendação de ações específicas
- Criptomoedas de forma especulativa
- Esquemas piramidais ou MLM
- Promessas de "ficar rico rápido", "rendimento garantido", "sem risco"

PARA CADA KEYWORD, decida:
- APROVAR_ARTIGO_NOVO: keyword cabe num cluster, tema relevante, sem conflito → cria artigo novo
- ATUALIZAR_ARTIGO_EXISTENTE: já temos artigo parecido (você verá o ID), melhor atualizar
- VIRAR_SECAO_DE_ARTIGO_EXISTENTE: keyword é sub-tópico de algo existente
- REJEITAR_POR_REPETICAO: muito similar a artigo já publicado
- REJEITAR_FORA_DO_ESCOPO: fora do escopo permitido

Retorne JSON: { decision, title (50-65 chars), cluster_slug, funnel_stage (top|mid|bottom), audience, pain_point, reason }`;

async function decideForKeyword(
  kw: KeywordRow,
  clusters: ClusterRow[],
  similar: { id: string; similarity: number } | null,
): Promise<StrategistOutput> {
  const clustersText = clusters
    .map((c) => `- ${c.slug}: ${c.title} — palavras-chave: ${c.main_keywords.join(', ')}`)
    .join('\n');

  const similarText = similar
    ? `\nARTIGO SIMILAR JÁ EXISTE (cosine ${similar.similarity.toFixed(2)}, id=${similar.id})`
    : '\nSem artigo similar no banco.';

  const userPrompt = `Keyword: "${kw.keyword}"
Volume: ${kw.search_volume ?? 'N/A'}
Intent: ${kw.intent ?? 'N/A'}
Categoria pré-classificada: ${kw.category}
${similarText}

Clusters disponíveis:
${clustersText}

Decida e retorne só o JSON.`;

  const result = await complete({
    tier: 'light',
    system: SYSTEM,
    messages: [{ role: 'user', content: userPrompt }],
    max_tokens: 600,
    temperature: 0.3,
  });

  try {
    const parsed = extractJsonBlock(result.text) as StrategistOutput;
    return parsed;
  } catch (err) {
    logger.warn({ err, text: result.text.slice(0, 300) }, '[02-strategist] failed to parse');
    return {
      decision: 'REJEITAR_FORA_DO_ESCOPO',
      title: kw.keyword,
      reason: 'failed to parse LLM output',
    };
  }
}

export async function runSeoStrategist(opts: { batch_id: string }): Promise<{
  approvedTopicIds: string[];
  summary: Record<StrategistDecision, number>;
}> {
  const runId = await startAgentRun({ agent_id: '02-seo-strategist', triggered_by: 'pipeline', input: opts });

  const keywords = await query<KeywordRow>(
    `SELECT id, keyword, category, search_volume, difficulty, intent, status
       FROM seo.keywords
      WHERE company_id = $1 AND status = 'pending'
      ORDER BY COALESCE(search_volume, 0) DESC NULLS LAST
      LIMIT 40`,
    [config.COMPANY_ID],
  );

  const clusters = await query<ClusterRow>(
    `SELECT id, slug, title, description, category, main_keywords
       FROM seo.clusters
      WHERE company_id = $1`,
    [config.COMPANY_ID],
  );

  const approvedTopicIds: string[] = [];
  const summary: Record<StrategistDecision, number> = {
    APROVAR_ARTIGO_NOVO: 0,
    ATUALIZAR_ARTIGO_EXISTENTE: 0,
    VIRAR_SECAO_DE_ARTIGO_EXISTENTE: 0,
    REJEITAR_POR_REPETICAO: 0,
    REJEITAR_FORA_DO_ESCOPO: 0,
  };

  for (const kw of keywords) {
    if (!isInScope(kw.keyword).ok) {
      await exec(`UPDATE seo.keywords SET status='rejected' WHERE id=$1`, [kw.id]);
      summary.REJEITAR_FORA_DO_ESCOPO++;
      continue;
    }

    const rep = await checkRepetition(kw.keyword);
    if (rep.decision === 'REJECT') {
      await exec(`UPDATE seo.keywords SET status='rejected' WHERE id=$1`, [kw.id]);
      summary.REJEITAR_POR_REPETICAO++;
      continue;
    }

    const decision = await decideForKeyword(
      kw,
      clusters,
      rep.similar_article_id ? { id: rep.similar_article_id, similarity: rep.max_cosine } : null,
    );

    summary[decision.decision] = (summary[decision.decision] ?? 0) + 1;

    if (decision.decision !== 'APROVAR_ARTIGO_NOVO' && decision.decision !== 'ATUALIZAR_ARTIGO_EXISTENTE') {
      await exec(`UPDATE seo.keywords SET status='rejected' WHERE id=$1`, [kw.id]);
      continue;
    }

    const cluster = clusters.find((c) => c.slug === decision.cluster_slug);

    const topic = await queryOne<{ id: string }>(
      `INSERT INTO seo.topics (company_id, title, main_keyword_id, category, intent, audience, pain_point, cluster_id, funnel_stage, decision, decision_reason, target_article_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        config.COMPANY_ID,
        decision.title ?? kw.keyword,
        kw.id,
        kw.category,
        kw.intent,
        decision.audience ?? null,
        decision.pain_point ?? null,
        cluster?.id ?? null,
        decision.funnel_stage ?? 'top',
        decision.decision,
        decision.reason ?? null,
        decision.decision === 'ATUALIZAR_ARTIGO_EXISTENTE' ? rep.similar_article_id : null,
      ],
    );

    if (topic) {
      approvedTopicIds.push(topic.id);
      await exec(`UPDATE seo.keywords SET status='used' WHERE id=$1`, [kw.id]);
    }
  }

  await finishAgentRun({ run_id: runId, output: { approvedTopicIds: approvedTopicIds.length, summary } });
  logger.info({ summary }, '[02-strategist] done');

  return { approvedTopicIds, summary };
}
