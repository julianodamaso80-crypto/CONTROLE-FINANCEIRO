import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { CATEGORIES, getAllPosts } from '@/lib/blog';

interface PageProps {
  params: { category: string };
}

export async function generateStaticParams() {
  return Object.keys(CATEGORIES).map((category) => ({ category }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const cat = CATEGORIES[params.category];
  if (!cat) return {};
  return {
    title: `${cat.label} | Blog Meu Caixa`,
    description: cat.description,
    alternates: { canonical: `/blog/categoria/${params.category}` },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const cat = CATEGORIES[params.category];
  if (!cat) notFound();
  const all = await getAllPosts();
  const posts = all.filter((p) => p.category === params.category);

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <header className="mb-12">
        <Link href="/blog" className="text-sm font-bold text-[#90ff6b] hover:underline">
          ← Voltar pro blog
        </Link>
        <span
          className={`mt-6 inline-flex w-fit items-center gap-2 rounded-full border-2 px-4 py-1.5 text-xs font-bold uppercase tracking-widest ${cat.color}`}
        >
          Categoria
        </span>
        <h1 className="mt-4 font-display text-5xl font-extrabold tracking-tight md:text-6xl">
          {cat.label}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-white/70">{cat.description}</p>
      </header>

      {posts.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-white/20 p-12 text-center text-white/60">
          Ainda não há artigos nesta categoria. Volte em alguns dias.
        </p>
      ) : (
        <section className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border-2 border-white/10 bg-white/[0.02] transition hover:border-[#90ff6b]/40"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image
                  src={post.cover}
                  alt={post.cover_alt ?? post.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 400px"
                  className="object-cover transition group-hover:scale-[1.02]"
                />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-xl font-extrabold leading-tight">{post.title}</h3>
                <p className="mt-3 line-clamp-3 text-sm text-white/60">{post.description}</p>
                <div className="mt-auto pt-5 text-xs text-white/40">
                  {post.readingTimeMinutes} min ·{' '}
                  {new Date(post.publishedAt).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
