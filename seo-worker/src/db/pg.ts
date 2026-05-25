import pg from 'pg';
import { config } from '../config.js';

const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
});

export async function query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
  const r = await pool.query(sql, params as never);
  return r.rows as T[];
}

export async function queryOne<T = unknown>(sql: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function exec(sql: string, params?: unknown[]): Promise<void> {
  await pool.query(sql, params as never);
}

export async function closePool(): Promise<void> {
  await pool.end();
}

export { pool };
