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
          <Link href="/" className="flex items-center">
            <Image
              src="/logo-sem-fundo-2.png"
              alt="MeuCaixa"
              width={180}
              height={48}
              priority
              className="h-12 w-auto object-contain"
            />
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <Link href="/" className="font-bold text-[#90ff6b] hover:underline">
              Home
            </Link>
            <Link href="/#features" className="font-bold text-[#90ff6b] hover:underline">
              Recursos
            </Link>
            <Link href="/#planos" className="font-bold text-[#90ff6b] hover:underline">
              Planos
            </Link>
            <Link href="/blog" className="font-bold text-[#90ff6b] hover:underline">
              Blog
            </Link>
          </nav>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-[#90ff6b] bg-[#90ff6b] px-5 py-3 font-extrabold text-black"
          >
            Começar grátis
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
