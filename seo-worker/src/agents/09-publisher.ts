import { config } from '../config.js';
import { exec, queryOne } from '../db/pg.js';
import { commitFile } from '../integrations/github.js';
import { buildMdx } from '../lib/mdx.js';
import { startAgentRun, finishAgentRun } from '../db/repositories/agent-runs.js';
import { logger } from '../lib/logger.js';

interface ArticleRow {
  id: string;
  title: string;
  slug: string;
  meta_title: string | null;
  meta_description: string | null;
  category: string;
  main_keyword: string | null;
  cluster_id: string | null;
  funnel_stage: string | null;
  cover_image_url: string | null;
  mdx_content: string;
  status: string;
  review_status: string | null;
}

function extractTldr(body: string): string | null {
  const first = body.split('\n\n').find((p) => !p.trim().startsWith('#') && p.trim().length > 60);
  if (!first) return null;
  return first.replace(/\s+/g, ' ').trim().slice(0, 360);
}

export async function runPublisher(opts: { article_id: string; skip_human_review?: boolean }): Promise<{ published: boolean; pr_url?: string; reason?: string }> {
  const runId = await startAgentRun({ agent_id: '09-publisher', triggered_by: 'pipeline', input: opts });

  const a = await queryOne<ArticleRow>(
    `SELECT id, title, slug, meta_title, meta_description, category, main_keyword,
            cluster_id, funnel_stage, cover_image_url, mdx_content, status, review_status
       FROM seo.articles WHERE id = $1`,
    [opts.article_id],
  );
  if (!a) {
    await finishAgentRun({ run_id: runId, error: 'article not found' });
    return { published: false, reason: 'not found' };
  }

  if (a.status === 'published' || a.status === 'awaiting_pr_merge') {
    await finishAgentRun({ run_id: runId, output: { skipped: 'already published' } });
    return { published: false, reason: 'already published' };
  }
  if (a.review_status === 'REPROVADO') {
    await finishAgentRun({ run_id: runId, output: { skipped: 'REPROVADO' } });
    return { published: false, reason: 'REPROVADO' };
  }
  if (!config.AUTO_PUBLISH_ENABLED && !opts.skip_human_review) {
    await finishAgentRun({ run_id: runId, output: { skipped: 'AUTO_PUBLISH_ENABLED=false' } });
    return { published: false, reason: 'auto-publish disabled' };
  }

  const cluster = a.cluster_id
    ? await queryOne<{ slug: string }>(`SELECT slug FROM seo.clusters WHERE id = $1`, [a.cluster_id])
    : null;

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
      author: 'Equipe Editorial Meu Caixa',
      keywords: a.main_keyword ? [a.main_keyword] : [],
      tldr: extractTldr(a.mdx_content) ?? undefined,
    },
    body: a.mdx_content,
  });

  const path = `${config.WEBSITE_CONTENT_DIR}/${a.slug}.mdx`;

  try {
    const result = await commitFile({
      path,
      content: mdx,
      message: `feat(blog): ${a.title}`,
    });

    await exec(
      `UPDATE seo.articles
          SET status='awaiting_pr_merge',
              mdx_path=$1,
              mdx_sha=$2,
              pr_url=$3,
              updated_at=now()
        WHERE id=$4`,
      [path, result.sha, result.html_url, opts.article_id],
    );

    await finishAgentRun({ run_id: runId, output: { pr_url: result.html_url, path, sha: result.sha } });
    logger.info({ articleId: a.id, slug: a.slug, prUrl: result.html_url }, '[09-publisher] commit ok');
    return { published: true, pr_url: result.html_url };
  } catch (err) {
    logger.error({ err, articleId: a.id }, '[09-publisher] commit failed');
    await finishAgentRun({ run_id: runId, error: String(err) });
    return { published: false, reason: String(err).slice(0, 200) };
  }
}
