'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Menu, X } from 'lucide-react';

export function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b-2 border-[#90ff6b] bg-black">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center" aria-label="MeuCaixa">
          <Image
            src="/logo-sem-fundo-2.png"
            alt="MeuCaixa"
            width={180}
            height={48}
            priority
            className="h-12 w-auto object-contain"
          />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          <a href="/#como-funciona" className="font-bold text-[#90ff6b] hover:underline">
            Como funciona
          </a>
          <a href="/#funcoes" className="font-bold text-[#90ff6b] hover:underline">
            O que faz
          </a>
          <a href="/#dia-a-dia" className="font-bold text-[#90ff6b] hover:underline">
            Dia a dia
          </a>
          <a href="/#planos" className="font-bold text-[#90ff6b] hover:underline">
            Planos
          </a>
          <Link href="/blog" className="font-bold text-[#90ff6b] hover:underline">
            Blog
          </Link>
          <Link href="/sobre" className="font-bold text-[#90ff6b] hover:underline">
            Sobre
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden font-bold text-[#90ff6b] hover:underline sm:inline"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="brutal-btn hidden items-center gap-2 rounded-xl border-2 border-[#90ff6b] bg-[#90ff6b] px-5 py-3 font-cabinet font-extrabold text-black sm:inline-flex"
          >
            Começar grátis
            <ArrowRight className="h-4 w-4" />
          </Link>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-[#90ff6b] text-[#90ff6b] lg:hidden"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t-2 border-[#90ff6b] bg-black lg:hidden">
          <nav className="flex flex-col gap-1 p-6">
            <a href="/#como-funciona" className="rounded-lg px-3 py-2.5 font-bold text-[#90ff6b]">
              Como funciona
            </a>
            <a href="/#funcoes" className="rounded-lg px-3 py-2.5 font-bold text-[#90ff6b]">
              O que faz
            </a>
            <a href="/#dia-a-dia" className="rounded-lg px-3 py-2.5 font-bold text-[#90ff6b]">
              Dia a dia
            </a>
            <a href="/#planos" className="rounded-lg px-3 py-2.5 font-bold text-[#90ff6b]">
              Planos
            </a>
            <Link href="/blog" className="rounded-lg px-3 py-2.5 font-bold text-[#90ff6b]">
              Blog
            </Link>
            <Link href="/sobre" className="rounded-lg px-3 py-2.5 font-bold text-[#90ff6b]">
              Sobre
            </Link>
            <Link href="/login" className="rounded-lg px-3 py-2.5 font-bold text-[#90ff6b]">
              Entrar
            </Link>
            <Link
              href="/register"
              className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#90ff6b] bg-[#90ff6b] px-5 py-3 font-cabinet font-extrabold text-black"
            >
              Começar grátis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
