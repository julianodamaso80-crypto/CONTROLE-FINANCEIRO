import { exec, query, queryOne } from '../db/pg.js';
import { complete } from '../integrations/llm.js';
import { commitFile } from '../integrations/github.js';
import { config } from '../config.js';
import { startAgentRun, finishAgentRun } from '../db/repositories/agent-runs.js';
import { logger } from '../lib/logger.js';
import { buildMdx } from '../lib/mdx.js';

const SYSTEM = `Você é o editor de atualização do blog do Meu Caixa. Recebe um artigo + recomendação e retorna a versão atualizada do corpo markdown — mantém estrutura, melhora pontos indicados, mantém o estilo. Retorne só o corpo markdown completo.`;

export async function runContentUpdater(): Promise<{ updated: number }> {
  const runId = await startAgentRun({ agent_id: '14-content-updater', triggered_by: 'cron', input: {} });

  const recs = await query<{ id: string; article_id: string; recommendation: string; reason: string; type: string }>(
    `SELECT id, article_id, recommendation, reason, type FROM seo.recommendations
      WHERE status = 'open' AND priority >= 4
      ORDER BY priority DESC, created_at ASC
      LIMIT 5`,
  );

  let updated = 0;
  for (const r of recs) {
    const a = await queryOne<{
      id: string; slug: string; title: string; mdx_path: string | null; mdx_content: string;
      category: string; cluster_id: string | null; funnel_stage: string | null;
      meta_description: string | null; cover_image_url: string | null; main_keyword: string | null;
    }>(
      `SELECT id, slug, title, mdx_path, mdx_content, category, cluster_id, funnel_stage,
              meta_description, cover_image_url, main_keyword
         FROM seo.articles WHERE id = $1`,
      [r.article_id],
    );
    if (!a) continue;

    try {
      const result = await complete({
        tier: 'main',
        system: SYSTEM,
        messages: [{
          role: 'user',
          content: `Artigo atual:\n${a.mdx_content}\n\nRecomendação (${r.type}): ${r.recommendation}\nMotivo: ${r.reason}\n\nReescreva o corpo aplicando a recomendação.`,
        }],
        max_tokens: 4000,
        temperature: 0.4,
      });
      const newBody = result.text.trim();

      const cluster = a.cluster_id ? await queryOne<{ slug: string }>(`SELECT slug FROM seo.clusters WHERE id = $1`, [a.cluster_id]) : null;
      const mdx = buildMdx({
        frontmatter: {
          title: a.title,
          description: a.meta_description ?? a.title,
          slug: a.slug,
          category: a.category,
          cluster: cluster?.slug ?? a.category,
          funnel_stage: a.funnel_stage ?? 'top',
          cover: a.cover_image_url ?? 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80',
          cover_alt: a.title,
          publishedAt: new Date().toISOString().slice(0, 10),
          updatedAt: new Date().toISOString().slice(0, 10),
          author: 'Equipe Editorial Meu Caixa',
          keywords: a.main_keyword ? [a.main_keyword] : [],
        },
        body: newBody,
      });

      const path = a.mdx_path ?? `${config.WEBSITE_CONTENT_DIR}/${a.slug}.mdx`;
      const commit = await commitFile({ path, content: mdx, message: `update(blog): ${a.title}` });

      const versionRow = await queryOne<{ next: number }>(
        `SELECT COALESCE(MAX(version), 0) + 1 AS next FROM seo.article_versions WHERE article_id = $1`,
        [a.id],
      );
      await exec(
        `INSERT INTO seo.article_versions (article_id, version, diff_summary, mdx_content, changed_by)
         VALUES ($1, $2, $3, $4, 'agent:14-content-updater')`,
        [a.id, versionRow?.next ?? 1, r.recommendation, newBody],
      );

      await exec(
        `UPDATE seo.articles SET mdx_content=$1, mdx_sha=$2, updated_at=now(), status='updating' WHERE id=$3`,
        [newBody, commit.sha, a.id],
      );
      await exec(`UPDATE seo.recommendations SET status='applied', applied_at=now() WHERE id=$1`, [r.id]);

      updated++;
    } catch (err) {
      logger.warn({ err, recId: r.id }, '[14-content-updater] failed for one recommendation');
    }
  }

  await finishAgentRun({ run_id: runId, output: { updated } });
  return { updated };
}
