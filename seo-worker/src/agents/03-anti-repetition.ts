import { query } from '../db/pg.js';
import { embed, toPgVector } from '../integrations/embeddings.js';
import { config } from '../config.js';

export interface AntiRepetitionResult {
  max_cosine: number;
  similar_article_id: string | null;
  decision: 'NEW' | 'UPDATE' | 'REJECT';
}

const REJECT_THRESHOLD = 0.85;
const UPDATE_THRESHOLD = 0.7;

export async function checkRepetition(text: string): Promise<AntiRepetitionResult> {
  const vec = await embed(text);
  const vecLit = toPgVector(vec);

  const rows = await query<{ id: string; similarity: number }>(
    `SELECT id, 1 - (embedding <=> $1::vector) AS similarity
       FROM seo.articles
      WHERE company_id = $2 AND embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT 5`,
    [vecLit, config.COMPANY_ID],
  );

  if (rows.length === 0) {
    return { max_cosine: 0, similar_article_id: null, decision: 'NEW' };
  }

  const top = rows[0];
  if (top.similarity >= REJECT_THRESHOLD) {
    return { max_cosine: top.similarity, similar_article_id: top.id, decision: 'REJECT' };
  }
  if (top.similarity >= UPDATE_THRESHOLD) {
    return { max_cosine: top.similarity, similar_article_id: top.id, decision: 'UPDATE' };
  }
  return { max_cosine: top.similarity, similar_article_id: null, decision: 'NEW' };
}
