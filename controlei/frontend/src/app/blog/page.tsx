import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Clock } from 'lucide-react';
import { CATEGORIES, getAllPosts } from '@/lib/blog';

export const revalidate = 300;

export default async function BlogIndexPage() {
  const posts = await getAllPosts();

  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <header className="mb-14 max-w-3xl">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border-2 border-[#90ff6b]/40 bg-[#90ff6b]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#90ff6b]">
          Blog
        </p>
        <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
          Sua vida financeira{' '}
          <span style={{ WebkitTextStroke: '2px #90ff6b', color: 'transparent' }}>
            mais simples
          </span>
          .
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-white/70">
          Guias práticos sobre controle de gastos, orçamento familiar e automação
          financeira pelo WhatsApp — escritos pra quem quer organizar o dinheiro sem
          complicação.
        </p>
      </header>

      <section aria-label="Categorias" className="mb-14 flex flex-wrap gap-3">
        {Object.entries(CATEGORIES).map(([slug, cat]) => (
          <Link
            key={slug}
            href={`/blog/categoria/${slug}`}
            className={`rounded-full border-2 px-4 py-2 text-sm font-bold transition hover:scale-[1.02] ${cat.color}`}
          >
            {cat.label}
          </Link>
        ))}
      </section>

      {posts.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-white/20 p-12 text-center">
          <p className="text-lg font-bold text-white/80">Conteúdo a caminho.</p>
          <p className="mt-2 text-sm text-white/50">
            Nossa esteira editorial está sendo abastecida — em breve novos artigos por aqui.
          </p>
        </div>
      )}

      {featured && (
        <article className="mb-16 group">
          <Link
            href={`/blog/${featured.slug}`}
            className="grid gap-8 rounded-3xl border-2 border-white/10 bg-white/[0.02] p-6 transition hover:border-[#90ff6b]/40 md:grid-cols-2 md:p-8"
          >
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#90ff6b]/20 via-emerald-500/10 to-transparent">
              {featured.cover && (
                <Image
                  src={featured.cover}
                  alt={featured.cover_alt ?? featured.title}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 600px"
                  className="object-cover transition group-hover:scale-[1.02]"
                />
              )}
              {!featured.cover && (
                <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
                  <span className="font-display text-3xl font-extrabold leading-tight text-white/90">
                    {featured.title}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center">
              <span
                className={`mb-3 inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-widest ${
                  CATEGORIES[featured.category]?.color ?? ''
                }`}
              >
                {CATEGORIES[featured.category]?.label ?? featured.category}
              </span>
              <h2 className="text-3xl font-extrabold leading-tight md:text-4xl">
                {featured.title}
              </h2>
              <p className="mt-4 text-base text-white/70">{featured.description}</p>
              <div className="mt-5 flex items-center gap-3 text-xs text-white/50">
                <Clock className="h-3.5 w-3.5" />
                {featured.readingTimeMinutes} min de leitura
              </div>
              <span className="mt-6 inline-flex items-center gap-2 font-bold text-[#90ff6b]">
                Ler artigo <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        </article>
      )}

      <section aria-label="Outros artigos" className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {rest.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group flex flex-col overflow-hidden rounded-2xl border-2 border-white/10 bg-white/[0.02] transition hover:border-[#90ff6b]/40"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#90ff6b]/20 via-emerald-500/10 to-transparent">
              {post.cover && (
                <Image
                  src={post.cover}
                  alt={post.cover_alt ?? post.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 400px"
                  className="object-cover transition group-hover:scale-[1.02]"
                />
              )}
              {!post.cover && (
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                  <span className="font-display text-xl font-extrabold leading-tight text-white/90">
                    {post.title}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col p-6">
              <span
                className={`mb-3 inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                  CATEGORIES[post.category]?.color ?? ''
                }`}
              >
                {CATEGORIES[post.category]?.label ?? post.category}
              </span>
              <h3 className="text-xl font-extrabold leading-tight">{post.title}</h3>
              <p className="mt-3 line-clamp-3 text-sm text-white/60">{post.description}</p>
              <div className="mt-auto pt-5 text-xs text-white/40">
                {post.readingTimeMinutes} min · {new Date(post.publishedAt).toLocaleDateString('pt-BR')}
              </div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
