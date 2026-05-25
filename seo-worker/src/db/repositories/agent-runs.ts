import { exec, queryOne } from '../pg.js';
import type { LlmResult } from '../../integrations/llm.js';

export async function startAgentRun(opts: {
  agent_id: string;
  triggered_by: string;
  input: unknown;
}): Promise<string> {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO seo.agent_runs (agent_id, triggered_by, input, status)
     VALUES ($1, $2, $3, 'running')
     RETURNING id`,
    [opts.agent_id, opts.triggered_by, opts.input],
  );
  if (!row) throw new Error('failed to create agent_run');
  return row.id;
}

export async function finishAgentRun(opts: {
  run_id: string;
  output: unknown;
  llm?: { provider: string; model: string; result: LlmResult };
  error?: string;
}): Promise<void> {
  if (opts.error) {
    await exec(
      `UPDATE seo.agent_runs
         SET status='error', error=$1, finished_at=now(),
             duration_ms=EXTRACT(EPOCH FROM (now() - started_at)) * 1000
       WHERE id=$2`,
      [opts.error, opts.run_id],
    );
    return;
  }

  await exec(
    `UPDATE seo.agent_runs
       SET status='success',
           output=$1,
           llm_provider=$2,
           llm_model=$3,
           llm_input_tokens=$4,
           llm_output_tokens=$5,
           llm_cost_usd=$6,
           finished_at=now(),
           duration_ms=EXTRACT(EPOCH FROM (now() - started_at)) * 1000
     WHERE id=$7`,
    [
      opts.output,
      opts.llm?.provider ?? null,
      opts.llm?.model ?? null,
      opts.llm?.result?.tokens_in ?? null,
      opts.llm?.result?.tokens_out ?? null,
      opts.llm?.result?.cost_usd ?? null,
      opts.run_id,
    ],
  );
}
