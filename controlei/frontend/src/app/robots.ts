import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/login', '/register', '/forgot-password'] },
      { userAgent: 'GPTBot', allow: '/blog' },
      { userAgent: 'PerplexityBot', allow: '/blog' },
      { userAgent: 'ClaudeBot', allow: '/blog' },
      { userAgent: 'Google-Extended', allow: '/blog' },
    ],
    sitemap: 'https://controlei.ia.br/sitemap.xml',
    host: 'https://controlei.ia.br',
  };
}
