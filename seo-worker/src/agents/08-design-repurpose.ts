import { complete, extractJsonBlock } from '../integrations/llm.js';
import { exec, queryOne } from '../db/pg.js';
import { startAgentRun, finishAgentRun } from '../db/repositories/agent-runs.js';
import { logger } from '../lib/logger.js';

const SYSTEM = `Você é um social media editor do Meu Caixa. Gera assets de repurpose a partir de um artigo do blog.

Retorne JSON:
{
  "instagram_carousel": [{ "slide": 1, "title": "...", "body": "30-40 palavras", "image_hint": "..." }],
  "reels_script": { "hook_3s": "...", "scenes": ["...","...","..."], "cta": "..." },
  "email_newsletter": { "subject": "...", "preview": "...", "body_html": "<p>...</p>", "cta_text": "..." },
  "faq_entries": [{ "q": "...", "a": "..." }, { "q": "...", "a": "..." }]
}

Tom: prático, sem promessa milagrosa. Use a marca "Meu Caixa".`;

interface RepurposeAssets {
  instagram_carousel?: unknown;
  reels_script?: unknown;
  email_newsletter?: unknown;
  faq_entries?: unknown;
}

export async function runDesignRepurpose(articleId: string): Promise<RepurposeAssets | null> {
  const runId = await startAgentRun({ agent_id: '08-design-repurpose', triggered_by: 'pipeline', input: { articleId } });
  const a = await queryOne<{ title: string; mdx_content: string }>(
    `SELECT title, mdx_content FROM seo.articles WHERE id = $1`,
    [articleId],
  );
  if (!a) {
    await finishAgentRun({ run_id: runId, error: 'article not found' });
    return null;
  }

  try {
    const llm = await complete({
      tier: 'light',
      system: SYSTEM,
      messages: [{ role: 'user', content: `Título: ${a.title}\n\n${a.mdx_content.slice(0, 6000)}` }],
      max_tokens: 1500,
      temperature: 0.6,
    });
    const parsed = extractJsonBlock(llm.text) as RepurposeAssets;

    await exec(
      `UPDATE seo.articles SET updated_at = now() WHERE id = $1`,
      [articleId],
    );

    await finishAgentRun({ run_id: runId, output: parsed });
    return parsed;
  } catch (err) {
    logger.warn({ err, articleId }, '[08-repurpose] failed (non-blocking)');
    await finishAgentRun({ run_id: runId, error: String(err) });
    return null;
  }
}
