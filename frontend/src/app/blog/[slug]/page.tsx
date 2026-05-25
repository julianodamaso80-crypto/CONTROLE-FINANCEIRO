import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { ChevronRight, Clock, MessageCircle } from 'lucide-react';
import { CATEGORIES, getAllSlugs, getPostBySlug } from '@/lib/blog';
import { ArticleSchema } from '@/components/blog/article-schema';

interface PageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);
  if (!post) return {};
  const url = `https://meucaixa.store/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: post.title,
      description: post.description,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? post.publishedAt,
      authors: [post.author ?? 'Equipe Editorial Meu Caixa'],
      images: [{ url: post.cover, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [post.cover],
    },
  };
}

const mdxComponents = {
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="mt-12 mb-6 font-display text-4xl font-extrabold tracking-tight" {...props} />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="mt-12 mb-5 font-display text-3xl font-extrabold tracking-tight" {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="mt-8 mb-4 text-2xl font-extrabold" {...props} />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="my-5 text-lg leading-relaxed text-white/80" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="my-5 list-disc space-y-2 pl-6 text-lg text-white/80" {...props} />
  ),
  ol: (props: React.OlHTMLAttributes<HTMLOListElement>) => (
    <ol className="my-5 list-decimal space-y-2 pl-6 text-lg text-white/80" {...props} />
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      className="font-bold text-[#90ff6b] underline decoration-[#90ff6b]/40 underline-offset-2 hover:decoration-[#90ff6b]"
      target={props.href?.startsWith('http') ? '_blank' : undefined}
      rel={props.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      {...props}
    />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="my-6 border-l-4 border-[#90ff6b] bg-[#90ff6b]/5 px-5 py-3 italic text-white/90"
      {...props}
    />
  ),
  table: (props: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="my-6 overflow-x-auto">
      <table className="w-full border-collapse border border-white/10 text-sm" {...props} />
    </div>
  ),
  th: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th className="border border-white/10 bg-white/[0.04] px-4 py-2 text-left font-bold" {...props} />
  ),
  td: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="border border-white/10 px-4 py-2 align-top text-white/80" {...props} />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-sm text-[#90ff6b]" {...props} />
  ),
};

export default async function BlogPostPage({ params }: PageProps) {
  const post = await getPostBySlug(params.slug);
  if (!post) notFound();
  const url = `https://meucaixa.store/blog/${post.slug}`;
  const category = CATEGORIES[post.category];

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <ArticleSchema post={post} url={url} />

      <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-sm text-white/50">
        <Link href="/" className="hover:text-white">
          Início
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/blog" className="hover:text-white">
          Blog
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="truncate text-white/80">{post.title}</span>
      </nav>

      <header className="mb-10">
        {category && (
          <span
            className={`mb-5 inline-flex items-center gap-2 rounded-full border-2 px-4 py-1.5 text-xs font-bold uppercase tracking-widest ${category.color}`}
          >
            {category.label}
          </span>
        )}
        <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight md:text-5xl">
          {post.title}
        </h1>
        <p className="mt-5 text-xl text-white/70">{post.description}</p>
        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-white/50">
          <span>{post.author ?? 'Equipe Editorial Meu Caixa'}</span>
          <span aria-hidden>·</span>
          <time dateTime={post.publishedAt}>
            {new Date(post.publishedAt).toLocaleDateString('pt-BR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </time>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {post.readingTimeMinutes} min de leitura
          </span>
        </div>
      </header>

      <div className="relative mb-10 aspect-[16/9] overflow-hidden rounded-2xl border-2 border-white/10">
        <Image
          src={post.cover}
          alt={post.cover_alt ?? post.title}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 800px"
          className="object-cover"
        />
      </div>

      {post.tldr && (
        <aside className="mb-12 rounded-2xl border-2 border-[#90ff6b]/30 bg-[#90ff6b]/[0.04] p-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#90ff6b]">
            TL;DR
          </p>
          <p className="text-lg text-white/90">{post.tldr}</p>
        </aside>
      )}

      <div className="prose-invert">
        <MDXRemote
          source={post.content}
          components={mdxComponents}
          options={{
            mdxOptions: {
              remarkPlugins: [remarkGfm],
              rehypePlugins: [rehypeSlug],
            },
          }}
        />
      </div>

      <section className="mt-16 rounded-3xl border-2 border-[#90ff6b]/30 bg-gradient-to-br from-[#90ff6b]/10 to-transparent p-8 text-center">
        <MessageCircle className="mx-auto mb-3 h-10 w-10 text-[#90ff6b]" strokeWidth={2.5} />
        <h2 className="font-display text-3xl font-extrabold">
          Quer ver os planos do Meu Caixa?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base text-white/70">
          Registre despesas pelo WhatsApp, a IA categoriza tudo e o relatório PDF mensal
          cai automático na sua conversa. Veja qual plano cabe no seu bolso.
        </p>
        <Link
          href="/#planos"
          className="mt-6 inline-flex items-center gap-2 rounded-xl border-2 border-[#90ff6b] bg-[#90ff6b] px-7 py-4 text-lg font-extrabold text-black transition hover:scale-[1.02]"
        >
          Ver planos e preços
        </Link>
      </section>
    </article>
  );
}
