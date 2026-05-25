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
    image: [post.cover],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: {
      '@type': 'Organization',
      name: post.author ?? 'Equipe Editorial Meu Caixa',
      url: 'https://meucaixa.store',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Meu Caixa',
      logo: { '@type': 'ImageObject', url: 'https://meucaixa.store/logo-sem-fundo-2.png' },
      url: 'https://meucaixa.store',
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
      { '@type': 'ListItem', position: 1, name: 'Início', item: 'https://meucaixa.store/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://meucaixa.store/blog' },
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
