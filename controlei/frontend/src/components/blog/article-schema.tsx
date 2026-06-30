import type { BlogPost } from '@/lib/blog';

interface Props {
  post: BlogPost;
  url: string;
}

export function ArticleSchema({ post, url }: Props) {
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    image: post.cover ? [post.cover] : ['https://controlei.ia.br/og-default.png'],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: {
      '@type': 'Organization',
      name: post.author ?? 'Equipe Editorial Controlei',
      url: 'https://controlei.ia.br',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Controlei',
      logo: { '@type': 'ImageObject', url: 'https://controlei.ia.br/logo-controlei.jpg' },
      url: 'https://controlei.ia.br',
    },
    mainEntityOfPage: url,
    keywords: (post.keywords ?? []).join(', '),
    inLanguage: 'pt-BR',
    articleSection: post.category,
    wordCount: post.wordCount,
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: 'https://controlei.ia.br/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://controlei.ia.br/blog' },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
    </>
  );
}
