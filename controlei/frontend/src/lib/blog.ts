import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import readingTime from 'reading-time';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'blog');

export interface BlogFrontmatter {
  title: string;
  description: string;
  slug: string;
  category: 'controle-de-gastos' | 'orcamento-familiar' | 'whatsapp-financeiro' | 'educacao-financeira';
  cluster: string;
  funnel_stage?: 'top' | 'mid' | 'bottom';
  cover: string;
  cover_alt?: string;
  publishedAt: string;
  updatedAt?: string;
  author?: string;
  keywords?: string[];
  faq?: { q: string; a: string }[];
  tldr?: string;
}

export interface BlogPost extends BlogFrontmatter {
  content: string;
  readingTimeMinutes: number;
  wordCount: number;
}

export interface BlogIndexEntry extends BlogFrontmatter {
  readingTimeMinutes: number;
}

async function ensureDir() {
  try {
    await fs.mkdir(CONTENT_DIR, { recursive: true });
  } catch {
    /* noop */
  }
}

export async function getAllSlugs(): Promise<string[]> {
  await ensureDir();
  try {
    const files = await fs.readdir(CONTENT_DIR);
    return files.filter((f) => f.endsWith('.mdx')).map((f) => f.replace(/\.mdx$/, ''));
  } catch {
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  await ensureDir();
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const { data, content } = matter(raw);
    const stats = readingTime(content);
    const fm = data as BlogFrontmatter;
    return {
      ...fm,
      slug,
      content,
      readingTimeMinutes: Math.max(1, Math.round(stats.minutes)),
      wordCount: stats.words,
    };
  } catch {
    return null;
  }
}

export async function getAllPosts(): Promise<BlogIndexEntry[]> {
  const slugs = await getAllSlugs();
  const all = await Promise.all(slugs.map((s) => getPostBySlug(s)));
  return all
    .filter((p): p is BlogPost => p !== null)
    .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
    .map((p) => ({
      ...p,
      readingTimeMinutes: p.readingTimeMinutes,
    }));
}

export const CATEGORIES: Record<string, { label: string; description: string; color: string }> = {
  'controle-de-gastos': {
    label: 'Controle de Gastos',
    description: 'Como organizar despesas pessoais e mensais',
    color: 'text-emerald-400 border-emerald-400/40 bg-emerald-400/5',
  },
  'orcamento-familiar': {
    label: 'Orçamento Familiar',
    description: 'Planejamento mensal, economia doméstica, dívidas',
    color: 'text-sky-400 border-sky-400/40 bg-sky-400/5',
  },
  'whatsapp-financeiro': {
    label: 'WhatsApp Financeiro',
    description: 'IA e automação para finanças via WhatsApp',
    color: 'text-violet-400 border-violet-400/40 bg-violet-400/5',
  },
  'educacao-financeira': {
    label: 'Educação Financeira',
    description: 'Conceitos básicos, score, IR, dívidas',
    color: 'text-amber-400 border-amber-400/40 bg-amber-400/5',
  },
};
