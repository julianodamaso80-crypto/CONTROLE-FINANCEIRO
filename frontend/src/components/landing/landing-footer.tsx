import Link from 'next/link';
import { Zap, Instagram } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer className="bg-[#171e19] py-16 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border-2 border-[#90ff6b] bg-[#90ff6b]">
                <Zap className="h-5 w-5 fill-black text-black" />
              </div>
              <span className="font-cabinet text-2xl font-extrabold">
                MeuCaixa
              </span>
            </Link>
            <p className="mt-4 max-w-xs font-medium text-[#b7c6c2]">
              Controle financeiro pelo WhatsApp.
              Feito no Brasil pra você organizar a vida financeira sem planilha.
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href="https://instagram.com/meucaixa"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-md border-2 border-[#272727] bg-[#272727] text-[#b7c6c2] transition-colors hover:border-[#90ff6b] hover:bg-[#90ff6b] hover:text-black"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://wa.me/5521983128245"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-md border-2 border-[#272727] bg-[#272727] text-[#b7c6c2] transition-colors hover:border-[#90ff6b] hover:bg-[#90ff6b] hover:text-black"
                aria-label="WhatsApp"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-cabinet text-lg font-extrabold">Produto</h4>
            <ul className="space-y-3">
              <li><a href="/#como-funciona" className="font-medium text-[#b7c6c2] hover:text-[#90ff6b]">Como funciona</a></li>
              <li><a href="/#funcoes" className="font-medium text-[#b7c6c2] hover:text-[#90ff6b]">O que faz</a></li>
              <li><a href="/#dia-a-dia" className="font-medium text-[#b7c6c2] hover:text-[#90ff6b]">Dia a dia</a></li>
              <li><a href="/#planos" className="font-medium text-[#b7c6c2] hover:text-[#90ff6b]">Preços</a></li>
              <li><a href="/#faq" className="font-medium text-[#b7c6c2] hover:text-[#90ff6b]">Dúvidas</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-cabinet text-lg font-extrabold">Empresa</h4>
            <ul className="space-y-3">
              <li><Link href="/sobre" className="font-medium text-[#b7c6c2] hover:text-[#90ff6b]">Sobre</Link></li>
              <li><Link href="/blog" className="font-medium text-[#b7c6c2] hover:text-[#90ff6b]">Blog</Link></li>
              <li>
                <a
                  href="https://wa.me/5521983128245"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#b7c6c2] hover:text-[#90ff6b]"
                >
                  Contato
                </a>
              </li>
              <li><Link href="/termosdeservico" className="font-medium text-[#b7c6c2] hover:text-[#90ff6b]">Termos</Link></li>
              <li><Link href="/privacidade" className="font-medium text-[#b7c6c2] hover:text-[#90ff6b]">Privacidade</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-6 border-t border-[#272727] pt-8 md:flex-row md:items-center">
          <p className="text-sm font-medium text-[#b7c6c2]">
            © 2026 MeuCaixa. Todos os direitos reservados.
          </p>
          <p className="text-sm font-medium text-[#b7c6c2]">
            Feito com <span className="text-[#90ff6b]">verde</span> no Brasil 🇧🇷
          </p>
        </div>
      </div>
    </footer>
  );
}
