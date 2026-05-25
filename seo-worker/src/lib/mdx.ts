interface Frontmatter {
  title: string;
  description: string;
  slug: string;
  category: string;
  cluster: string;
  funnel_stage: string;
  cover: string;
  cover_alt: string;
  publishedAt: string;
  updatedAt?: string;
  author?: string;
  keywords?: string[];
  tldr?: string;
}

function escapeYaml(v: string): string {
  return v.replace(/"/g, '\\"');
}

export function buildMdx(opts: { frontmatter: Frontmatter; body: string }): string {
  const f = opts.frontmatter;
  const fmLines: string[] = [
    '---',
    `title: "${escapeYaml(f.title)}"`,
    `description: "${escapeYaml(f.description)}"`,
    `slug: "${f.slug}"`,
    `category: "${f.category}"`,
    `cluster: "${f.cluster}"`,
    `funnel_stage: "${f.funnel_stage}"`,
    `cover: "${f.cover}"`,
    `cover_alt: "${escapeYaml(f.cover_alt)}"`,
    `publishedAt: "${f.publishedAt}"`,
  ];
  if (f.updatedAt) fmLines.push(`updatedAt: "${f.updatedAt}"`);
  if (f.author) fmLines.push(`author: "${escapeYaml(f.author)}"`);
  if (f.keywords && f.keywords.length > 0) {
    fmLines.push('keywords:');
    for (const k of f.keywords) fmLines.push(`  - "${escapeYaml(k)}"`);
  }
  if (f.tldr) fmLines.push(`tldr: "${escapeYaml(f.tldr)}"`);
  fmLines.push('---', '');

  return fmLines.join('\n') + '\n' + opts.body.trim() + '\n';
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}
