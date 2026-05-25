import { exec, queryOne } from '../db/pg.js';
import { startAgentRun, finishAgentRun } from '../db/repositories/agent-runs.js';
import { logger } from '../lib/logger.js';

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max - 20 ? cut.slice(0, lastSpace) : cut) + '…';
}

function deriveDescriptionFromBody(body: string): string {
  const stripped = body
    .replace(/^---[\s\S]+?---/, '')
    .replace(/```[\s\S]+?```/g, '')
    .replace(/#+\s.+/g, '')
    .replace(/\[[^\]]+\]\([^)]+\)/g, '')
    .replace(/[*_`>]/g, '')
    .trim();
  const firstPara = stripped.split('\n\n')[0] ?? stripped;
  return firstPara.replace(/\s+/g, ' ').trim();
}

export async function runOnPageSeo(articleId: string): Promise<void> {
  const runId = await startAgentRun({ agent_id: '07-onpage-seo', triggered_by: 'pipeline', input: { articleId } });
  const a = await queryOne<{
    id: string;
    title: string;
    slug: string;
    meta_title: string | null;
    meta_description: string | null;
    main_keyword: string | null;
    mdx_content: string;
  }>(
    `SELECT id, title, slug, meta_title, meta_description, main_keyword, mdx_content
       FROM seo.articles WHERE id = $1`,
    [articleId],
  );
  if (!a) {
    await finishAgentRun({ run_id: runId, error: 'article not found' });
    return;
  }

  let metaTitle = a.meta_title || a.title;
  metaTitle = truncate(metaTitle, 65);

  let metaDescription = a.meta_description ?? '';
  if (!metaDescription || metaDescription.length < 80 || metaDescription.length > 165) {
    metaDescription = truncate(deriveDescriptionFromBody(a.mdx_content), 158);
  }

  const slugClean = (a.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 80);

  await exec(
    `UPDATE seo.articles SET meta_title=$1, meta_description=$2, slug=$3 WHERE id=$4`,
    [metaTitle, metaDescription, slugClean, articleId],
  );

  await finishAgentRun({ run_id: runId, output: { metaTitle, metaDescription, slug: slugClean } });
  logger.info({ articleId, slug: slugClean }, '[07-onpage] applied');
}
