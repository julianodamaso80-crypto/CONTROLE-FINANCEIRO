import { Octokit } from '@octokit/rest';
import { config } from '../config.js';

const octokit = config.GITHUB_TOKEN ? new Octokit({ auth: config.GITHUB_TOKEN }) : null;

function parseRepo(): { owner: string; repo: string } {
  if (!config.GITHUB_REPO) throw new Error('GITHUB_REPO not configured');
  const [owner, repo] = config.GITHUB_REPO.split('/');
  if (!owner || !repo) throw new Error('GITHUB_REPO must be in owner/repo format');
  return { owner, repo };
}

export async function commitFile(opts: {
  path: string;
  content: string;
  message: string;
  branch?: string;
}): Promise<{ html_url: string; sha: string }> {
  if (!octokit) throw new Error('GITHUB_TOKEN not configured');
  const { owner, repo } = parseRepo();
  const branch = opts.branch ?? config.GITHUB_BRANCH_BASE;

  let existingSha: string | undefined;
  try {
    const existing = await octokit.rest.repos.getContent({ owner, repo, path: opts.path, ref: branch });
    if (!Array.isArray(existing.data) && 'sha' in existing.data) {
      existingSha = existing.data.sha;
    }
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status !== 404) throw err;
  }

  const res = await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: opts.path,
    message: opts.message,
    content: Buffer.from(opts.content, 'utf8').toString('base64'),
    branch,
    sha: existingSha,
  });

  return {
    html_url: res.data.content?.html_url ?? '',
    sha: res.data.content?.sha ?? '',
  };
}
