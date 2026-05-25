import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

export const metadata: Metadata = {
  title: {
    template: '%s | Blog Meu Caixa',
    default: 'Blog Meu Caixa — Controle Financeiro, Orçamento e WhatsApp',
  },
  description:
    'Conteúdo prático sobre controle de gastos, orçamento familiar e automação financeira pelo WhatsApp.',
  alternates: { canonical: '/blog' },
};

const organizationLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Meu Caixa',
  url: 'https://meucaixa.store',
  logo: 'https://meucaixa.store/logo-sem-fundo-2.png',
  description: 'SaaS de controle financeiro pessoal com IA e WhatsApp.',
  sameAs: ['https://www.instagram.com/meucaixa.store'],
};

const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Meu Caixa',
  url: 'https://meucaixa.store',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://meucaixa.store/blog?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0f0c] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
      />

      <header className="sticky top-0 z-50 h-20 border-b-2 border-[#90ff6b] bg-black">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          <Link href="/blog" className="flex items-center gap-3">
            <Image
              src="/logo-sem-fundo-2.png"
              alt="Meu Caixa Blog"
              width={140}
              height={40}
              priority
              className="h-10 w-auto object-contain"
            />
            <span className="hidden font-display text-lg font-bold text-white/80 sm:inline">/ Blog</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/blog/categoria/controle-de-gastos"
              className="text-sm font-bold text-white/70 transition hover:text-[#90ff6b]"
            >
              Controle de Gastos
            </Link>
            <Link
              href="/blog/categoria/orcamento-familiar"
              className="text-sm font-bold text-white/70 transition hover:text-[#90ff6b]"
            >
              Orçamento Familiar
            </Link>
            <Link
              href="/blog/categoria/whatsapp-financeiro"
              className="text-sm font-bold text-white/70 transition hover:text-[#90ff6b]"
            >
              WhatsApp Financeiro
            </Link>
            <Link
              href="/blog/categoria/educacao-financeira"
              className="text-sm font-bold text-white/70 transition hover:text-[#90ff6b]"
            >
              Educação Financeira
            </Link>
          </nav>
          <Link
            href="/#planos"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-[#90ff6b] bg-[#90ff6b] px-4 py-2.5 text-sm font-extrabold text-black transition hover:scale-[1.02]"
          >
            Ver planos
          </Link>
        </div>
      </header>

      <main>{children}</main>

      <footer className="mt-24 border-t border-white/10 bg-black/40 px-6 py-12 text-sm text-white/60">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="font-extrabold text-white">Meu Caixa</p>
            <p className="mt-1">Controle de gastos por WhatsApp — feito no Brasil.</p>
          </div>
          <div className="flex flex-wrap gap-6">
            <Link href="/privacidade" className="hover:text-white">
              Privacidade
            </Link>
            <Link href="/termosdeservico" className="hover:text-white">
              Termos
            </Link>
            <Link href="/blog" className="hover:text-white">
              Blog
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
