import { config } from '../config.js';
import { exec } from '../db/pg.js';
import { checkUrl } from '../integrations/sitemap.js';

export async function runSitemap(articleId: string, articleUrl: string): Promise<boolean> {
  const result = await checkUrl(articleUrl);
  await exec(
    `INSERT INTO seo.indexing_log (article_id, url, channel, action, response_status)
     VALUES ($1, $2, 'sitemap', 'validate', $3)`,
    [articleId, articleUrl, result.status],
  );
  void config;
  return result.ok;
}
