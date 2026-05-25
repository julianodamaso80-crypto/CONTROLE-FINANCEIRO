import { config, resolveLlmModel } from '../config.js';
import { exec, query, queryOne } from '../db/pg.js';
import { complete } from '../integrations/llm.js';
import { embed, toPgVector } from '../integrations/embeddings.js';
import { generateCover } from '../integrations/image-gen.js';
import { logger } from '../lib/logger.js';
import { startAgentRun, finishAgentRun } from '../db/repositories/agent-runs.js';
import { countWords, slugify } from '../lib/mdx.js';
import type { DataSourceRow } from './_types.js';

interface WriterContext {
  topicId: string;
  briefingId: string;
  clusterId: string | null;
  clusterSlug: string | null;
  category: string;
  funnelStage: string;
  title: string;
  seoTitle: string;
  h1: string;
  outline: unknown;
  faqs: unknown;
  internalLinks: unknown;
  legalNotes: string | null;
  imageSuggestion: string | null;
  dataSources: DataSourceRow[];
  similarArticles: { slug: string; title: string }[];
  mainKeyword: string;
}

const SYSTEM = `Você é um redator do blog do Meu Caixa. Escreve em português brasileiro claro, prático e baseado em fontes.

ESTRUTURA OBRIGATÓRIA do artigo:
1) **TL;DR**: 40-60 palavras, primeira coisa do post (sem H2)
2) **Intro**: 80-120 palavras
3) **5 H2s no formato PERGUNTA** (Ex: "Como organizar gastos mensais?") — cada um com 200-280 palavras:
   - Parágrafo 1: resposta atômica direta de 40-60 palavras
   - Parágrafos 2-3: aprofundamento com exemplo e/ou dado citado
4) **## Em resumo**: 60-100 palavras com 5-7 bullets numerados
5) **## Perguntas frequentes**: 3 perguntas com respostas de 30-50 palavras cada
6) **CTA final**: 50-80 palavras convidando a ver os planos do Meu Caixa

ATENÇÃO — NÃO INCLUIR seção "## Fontes consultadas" no final. As citações ficam INLINE no corpo (no formato "segundo a Serasa", "de acordo com o BACEN", "dados do IBGE") — pelo menos 3 por artigo. Lista de fontes agregadas no final foi removida.

OBRIGATÓRIO — 3 CTAs DISTRIBUÍDOS NO ARTIGO APONTANDO PRA /#planos (REGRA HARD):
- **CTA #1** após o 2º H2, parágrafo curto com link [Veja os planos do Meu Caixa](/#planos) ou [Quanto custa o Meu Caixa](/#planos) — ângulo: descoberta de preço
- **CTA #2** antes do "## Em resumo", parágrafo curto com link [Compare os planos](/#planos) ou [Conheça os planos do Meu Caixa](/#planos) — ângulo: comparação
- **CTA #3** depois das "## Fontes consultadas", parágrafo de 50-80 palavras com link [Ver planos e preços](/#planos) — ângulo: decisão
- Cada CTA deve ter texto diferente e linkar pra "/#planos" (NÃO use /register, /cotacao, /protecao-veicular ou qualquer outra URL)
- Se faltar QUALQUER um dos 3, o Reviewer reprova o artigo

OBRIGATÓRIO:
- Citar 3+ dados específicos no formato "segundo a {fonte}", "de acordo com o {fonte}"
- Mencionar a marca "Meu Caixa" 2-3 vezes no corpo (não exagerar)
- Incluir 3+ links internos pra outros artigos do blog (formato: [texto](/blog/{slug}))
- Word count entre 1300 e 1500 palavras
- Tom: prático, sem jargão, sem promessa milagrosa

NUNCA escreva: "fique rico rápido", "rendimento garantido", "investimento sem risco", "vai dobrar seu dinheiro", "ganhar dinheiro fácil", recomendação de ação específica, recomendação de cripto especulativa.

Retorne só o corpo markdown completo do artigo (sem frontmatter, sem cercas \`\`\`).`;

async function pickDataSources(category: string): Promise<DataSourceRow[]> {
  const rows = await query<DataSourceRow>(
    `SELECT id, type, topic_tags, title, fact, source_name, source_url
       FROM seo.data_sources
      WHERE company_id = $1
        AND ($2 = ANY(topic_tags) OR topic_tags && ARRAY['educacao-financeira']::text[])
      ORDER BY random()
      LIMIT 6`,
    [config.COMPANY_ID, category],
  );
  return rows;
}

async function pickSimilarArticles(clusterId: string | null): Promise<{ slug: string; title: string }[]> {
  if (!clusterId) return [];
  return query<{ slug: string; title: string }>(
    `SELECT slug, title FROM seo.articles
      WHERE company_id = $1 AND cluster_id = $2 AND status IN ('published','awaiting_pr_merge')
      ORDER BY published_at DESC NULLS LAST
      LIMIT 5`,
    [config.COMPANY_ID, clusterId],
  );
}

function buildUserPrompt(ctx: WriterContext): string {
  const sourcesText = ctx.dataSources
    .map((s) => `- ${s.title}: ${s.fact} (fonte: ${s.source_name} — ${s.source_url ?? 'sem link'})`)
    .join('\n');

  const linksText = ctx.similarArticles.length
    ? ctx.similarArticles.map((a) => `- /blog/${a.slug} (${a.title})`).join('\n')
    : '- (nenhum link interno disponível ainda — use slugs imaginários como /blog/como-controlar-gastos)';

  return `Tópico: ${ctx.title}
Categoria: ${ctx.category}
Cluster: ${ctx.clusterSlug ?? 'sem cluster'}
Funil: ${ctx.funnelStage}
H1 sugerido: ${ctx.h1}
SEO title sugerido: ${ctx.seoTitle}
Keyword principal: ${ctx.mainKeyword}

Outline obrigatório (use como H2s, transformando em PERGUNTAS naturais):
${JSON.stringify(ctx.outline, null, 2)}

FAQs do briefing:
${JSON.stringify(ctx.faqs, null, 2)}

Dados pra citar (use pelo menos 3 com "segundo {fonte}"):
${sourcesText}

Artigos pra linkar internamente (use pelo menos 3):
${linksText}

${ctx.legalNotes ? `Ressalvas: ${ctx.legalNotes}` : ''}

Escreva o artigo agora. Comece com o TL;DR de 40-60 palavras (sem H2), depois a intro, depois os 5 H2s, etc.`;
}

export async function runWriter(briefingId: string): Promise<{ articleId: string } | { skipped: true; reason: string }> {
  const runId = await startAgentRun({ agent_id: '05-writer', triggered_by: 'pipeline', input: { briefingId } });

  const briefing = await queryOne<{
    id: string;
    topic_id: string;
    seo_title: string;
    h1: string;
    outline: unknown;
    faqs: unknown;
    internal_links: unknown;
    legal_notes: string | null;
    image_suggestion: string | null;
  }>(
    `SELECT id, topic_id, seo_title, h1, outline, faqs, internal_links, legal_notes, image_suggestion
       FROM seo.briefings WHERE id = $1`,
    [briefingId],
  );
  if (!briefing) {
    await finishAgentRun({ run_id: runId, output: { skipped: 'briefing not found' } });
    return { skipped: true, reason: 'briefing not found' };
  }

  const topic = await queryOne<{
    title: string;
    category: string;
    funnel_stage: string;
    cluster_id: string | null;
  }>(
    `SELECT title, category, funnel_stage, cluster_id FROM seo.topics WHERE id = $1`,
    [briefing.topic_id],
  );
  if (!topic) {
    await finishAgentRun({ run_id: runId, output: { skipped: 'topic not found' } });
    return { skipped: true, reason: 'topic not found' };
  }

  const cluster = topic.cluster_id
    ? await queryOne<{ slug: string }>(`SELECT slug FROM seo.clusters WHERE id = $1`, [topic.cluster_id])
    : null;

  const dataSources = await pickDataSources(topic.category);
  const similarArticles = await pickSimilarArticles(topic.cluster_id);

  const slugBase = slugify(briefing.h1 || topic.title);
  let slug = slugBase;
  let collisionCount = 0;
  while (await queryOne(`SELECT 1 FROM seo.articles WHERE slug = $1`, [slug])) {
    collisionCount++;
    slug = `${slugBase}-${collisionCount}`;
    if (collisionCount > 5) break;
  }

  const ctx: WriterContext = {
    topicId: briefing.topic_id,
    briefingId: briefing.id,
    clusterId: topic.cluster_id,
    clusterSlug: cluster?.slug ?? null,
    category: topic.category,
    funnelStage: topic.funnel_stage,
    title: topic.title,
    seoTitle: briefing.seo_title,
    h1: briefing.h1,
    outline: briefing.outline,
    faqs: briefing.faqs,
    internalLinks: briefing.internal_links,
    legalNotes: briefing.legal_notes,
    imageSuggestion: briefing.image_suggestion,
    dataSources,
    similarArticles,
    mainKeyword: topic.title,
  };

  const llmResult = await complete({
    tier: 'main',
    system: SYSTEM,
    messages: [{ role: 'user', content: buildUserPrompt(ctx) }],
    max_tokens: 4000,
    temperature: 0.6,
  });

  const body = llmResult.text.replace(/^```(?:markdown|md)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  const wordCount = countWords(body);
  const readTime = Math.max(1, Math.round(wordCount / 220));

  const tldrMatch = body.match(/^([^\n#]{40,400})/);
  const tldr = tldrMatch ? tldrMatch[1].trim().slice(0, 360) : briefing.h1;

  const cover = await generateCover({ slug, title: topic.title, category: topic.category });
  const embedding = await embed(`${topic.title}\n${body.slice(0, 4000)}`);

  const inserted = await queryOne<{ id: string }>(
    `INSERT INTO seo.articles (
       company_id, topic_id, briefing_id, cluster_id, funnel_stage,
       title, slug, meta_title, meta_description, category, main_keyword,
       mdx_content, cover_image_url, embedding, status, word_count, read_time_min
     ) VALUES (
       $1, $2, $3, $4, $5,
       $6, $7, $8, $9, $10, $11,
       $12, $13, $14::vector, 'draft', $15, $16
     ) RETURNING id`,
    [
      config.COMPANY_ID,
      briefing.topic_id,
      briefing.id,
      topic.cluster_id,
      topic.funnel_stage,
      briefing.h1 || topic.title,
      slug,
      (briefing.seo_title || briefing.h1 || topic.title).slice(0, 65),
      tldr.slice(0, 160),
      topic.category,
      topic.title,
      body,
      cover.url,
      toPgVector(embedding),
      wordCount,
      readTime,
    ],
  );

  if (!inserted) {
    await finishAgentRun({ run_id: runId, error: 'failed to insert article' });
    return { skipped: true, reason: 'insert failed' };
  }

  await finishAgentRun({
    run_id: runId,
    output: { articleId: inserted.id, slug, wordCount },
    llm: { provider: 'openrouter', model: resolveLlmModel('main').model, result: llmResult },
  });

  logger.info({ articleId: inserted.id, slug, wordCount }, '[05-writer] article generated');
  void exec;
  return { articleId: inserted.id };
}
