import { config } from '../config.js';
import { exec } from '../db/pg.js';
import { submitUrl, submitSitemap } from '../integrations/bing.js';
import { submit as indexnowSubmit } from '../integrations/indexnow.js';

export async function runBingIndexNow(articleId: string, articleUrl: string): Promise<void> {
  const sitemapUrl = `${config.SITE_URL}/sitemap.xml`;

  const bingUrl = await submitUrl(articleUrl);
  await exec(
    `INSERT INTO seo.indexing_log (article_id, url, channel, action, response_status)
     VALUES ($1, $2, 'bing_wmt', 'submit', $3)`,
    [articleId, articleUrl, bingUrl ? 200 : 0],
  );

  const bingSitemap = await submitSitemap(sitemapUrl);
  await exec(
    `INSERT INTO seo.indexing_log (article_id, url, channel, action, response_status)
     VALUES ($1, $2, 'bing_wmt', 'submit', $3)`,
    [articleId, sitemapUrl, bingSitemap ? 200 : 0],
  );

  const indexNowOk = await indexnowSubmit([articleUrl]);
  await exec(
    `INSERT INTO seo.indexing_log (article_id, url, channel, action, response_status)
     VALUES ($1, $2, 'indexnow', 'submit', $3)`,
    [articleId, articleUrl, indexNowOk ? 200 : 0],
  );
}
