import { config } from '../config.js';
import { exec } from '../db/pg.js';
import { submitSitemap, urlInspection } from '../integrations/gsc.js';

export async function runGoogleIndexing(articleId: string, articleUrl: string): Promise<void> {
  const sitemapUrl = `${config.SITE_URL}/sitemap.xml`;
  const submitted = await submitSitemap(sitemapUrl);
  await exec(
    `INSERT INTO seo.indexing_log (article_id, url, channel, action, response_status)
     VALUES ($1, $2, 'google_gsc', 'submit', $3)`,
    [articleId, articleUrl, submitted ? 200 : 0],
  );

  const inspection = await urlInspection(articleUrl);
  await exec(
    `INSERT INTO seo.indexing_log (article_id, url, channel, action, response_body)
     VALUES ($1, $2, 'url_inspection', 'recheck', $3)`,
    [articleId, articleUrl, inspection],
  );
}
