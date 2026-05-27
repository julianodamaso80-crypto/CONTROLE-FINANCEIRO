import type { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/blog';

const BASE = 'https://meucaixa.store';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const posts = await getAllPosts();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/sobre`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/blog`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    {
      url: `${BASE}/blog/categoria/controle-de-gastos`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE}/blog/categoria/orcamento-familiar`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE}/blog/categoria/whatsapp-financeiro`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE}/blog/categoria/educacao-financeira`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    { url: `${BASE}/privacidade`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/termosdeservico`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(p.publishedAt),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...postRoutes];
}
