import { HeroLightRays } from '@/components/shared/hero-light-rays';
import Image from 'next/image';
import Link from 'next/link';
import {
  Brain,
  Receipt,
  Check,
  X,
  ArrowRight,
  Mic,
  Image as ImageIcon,
  Type,
  Sparkles,
  FileText,
  BarChart3,
  Bot,
  MessageCircle,
} from 'lucide-react';
import { LandingHeader } from '@/components/landing/landing-header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { Flowchart } from '@/components/landing/flowchart';
import { Organogram } from '@/components/landing/organogram';
import { DailyTimeline } from '@/components/landing/daily-timeline';
import { DashboardShowcase } from '@/components/landing/dashboard-showcase';
import { TestimonialsWhatsApp } from '@/components/landing/testimonials-whatsapp';
import { FAQSection } from '@/components/landing/faq-section';

export const metadata = {
  title: 'Controlei — Controle de gastos pelo WhatsApp com IA',
  description:
    'Lance suas despesas e receitas falando no WhatsApp. A IA categoriza tudo, gera relatórios em PDF e te ajuda a organizar a vida financeira sem planilha.',
  keywords: [
    'controle de gastos pelo whatsapp',
    'app de controle financeiro',
    'organizar finanças pessoais',
    'planilha de gastos',
    'controle financeiro pessoal',
    'bot whatsapp financeiro',
    'relatório de gastos em pdf',
  ],
  openGraph: {
    type: 'website',
    url: 'https://controlei.ia.br',
    siteName: 'Controlei',
    title: 'Controlei — Controle de gastos pelo WhatsApp com IA',
    description:
      'Lance suas despesas e receitas falando no WhatsApp. A IA categoriza tudo e gera relatórios em PDF na hora.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Controlei — Controle de gastos pelo WhatsApp',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Controlei — Controle de gastos pelo WhatsApp com IA',
    description:
      'Lance suas despesas e receitas falando no WhatsApp. A IA categoriza tudo.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://controlei.ia.br',
  },
};

const capabilities = [
  { icon: Mic, label: 'ÁUDIO NO WHATSAPP' },
  { icon: ImageIcon, label: 'FOTO DA NOTA' },
  { icon: FileText, label: 'PDF DE BOLETO' },
  { icon: Type, label: 'TEXTO LIVRE' },
  { icon: Brain, label: 'IA CLASSIFICADORA' },
  { icon: Receipt, label: 'LANÇAMENTO AUTOMÁTICO' },
  { icon: BarChart3, label: 'DASHBOARD EM TEMPO REAL' },
  { icon: FileText, label: 'RELATÓRIO MENSAL EM PDF' },
  { icon: Bot, label: 'BOT 24/7' },
  { icon: Sparkles, label: 'ZERO PLANILHA' },
];

const orgSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Controlei',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web, WhatsApp',
  offers: [
    {
      '@type': 'Offer',
      name: 'Plano Mensal',
      price: '19.90',
      priceCurrency: 'BRL',
    },
    {
      '@type': 'Offer',
      name: 'Plano Anual',
      price: '199.90',
      priceCurrency: 'BRL',
    },
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    ratingCount: '127',
  },
  description:
    'Controle de gastos pelo WhatsApp com IA. Lance receitas, despesas, boletos e cupons. Dashboards em tempo real, relatório em PDF.',
};

export default function LandingPage() {
  return (
    <div className="font-satoshi text-black bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />

      <LandingHeader />

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden border-b-2 border-black bg-[#171e19]">
        <HeroLightRays />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-24 lg:grid-cols-2 lg:py-32">
          <div className="flex flex-col items-center justify-center text-center text-white lg:items-start lg:text-left">
            <span className="mb-8 inline-flex items-center gap-2 rounded-full border-2 border-[#90ff6b]/40 bg-[#90ff6b]/10 px-5 py-2 font-cabinet text-sm font-bold text-[#90ff6b]">
              <span className="h-2 w-2 rounded-full bg-[#90ff6b]" />
              NOVO: IA Classificadora 2.0 — agora com OCR e PDF
            </span>

            <h1 className="text-balance font-cabinet text-6xl font-extrabold leading-[0.95] tracking-tighter sm:text-7xl lg:text-8xl">
              Seu caixa{' '}
              <span style={{ WebkitTextStroke: '2px #90ff6b', color: 'transparent' }}>vive</span> no WhatsApp.
            </h1>

            <p className="mt-8 max-w-xl text-balance text-xl font-medium text-white/70">
              Lance despesas e receitas por <strong className="text-white">texto, áudio, foto da nota ou PDF de boleto</strong>.
              A IA categoriza tudo e ainda gera seu <strong className="text-white">relatório mensal em PDF</strong> direto no WhatsApp.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-5 lg:justify-start">
              <Link
                href="/register"
                className="brutal-btn inline-flex items-center gap-3 rounded-xl border-2 border-[#90ff6b] bg-[#90ff6b] px-8 py-5 font-cabinet text-lg font-extrabold text-black"
                style={{ boxShadow: '4px 4px 0px 0px #90ff6b' }}
              >
                Começar grátis
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#como-funciona"
                className="brutal-btn inline-flex items-center gap-3 rounded-xl border-2 border-white/20 bg-white/5 px-8 py-5 font-cabinet text-lg font-extrabold text-white backdrop-blur-sm"
                style={{ boxShadow: '4px 4px 0px 0px rgba(255,255,255,0.1)' }}
              >
                Ver como funciona
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm font-bold text-[#90ff6b] lg:justify-start">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5" strokeWidth={3} />
                3 dias grátis
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5" strokeWidth={3} />
                Sem cartão
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5" strokeWidth={3} />
                Cancele quando quiser
              </div>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div
              className="relative w-full max-w-xl rounded-2xl border-2 border-black bg-white"
              style={{ boxShadow: '12px 12px 0px 0px #000000' }}
            >
              <div className="pointer-events-none absolute -right-6 -top-8 z-20 rotate-[-10deg] sm:-right-10 sm:-top-10">
                <div
                  className="flex flex-col items-center justify-center rounded-2xl border-[3px] border-black bg-[#90ff6b] px-5 py-3 font-cabinet"
                  style={{ boxShadow: '4px 4px 0px 0px #000000' }}
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest">
                    <FileText className="h-3 w-3" strokeWidth={3} />
                    Novo
                  </div>
                  <div className="text-center text-sm font-extrabold uppercase leading-tight">
                    Relatório mensal
                    <br />
                    em PDF
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-t-2xl border-b-2 border-black bg-black px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <div className="h-3 w-3 rounded-full bg-[#b7c6c2]" />
                <div className="h-3 w-3 rounded-full bg-[#28c840]" />
                <div className="ml-4 flex-1 rounded-md border border-white/20 bg-[#171e19] px-3 py-1 text-xs font-bold text-[#b7c6c2]">
                  app.controlei.ia.br/dashboard
                </div>
              </div>

              <div className="grid gap-4 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase text-black/60">
                      Saldo do mês
                    </p>
                    <p className="font-cabinet text-4xl font-extrabold">
                      R$ 3.780
                    </p>
                  </div>
                  <span className="rounded-full border-2 border-black bg-[#90ff6b] px-3 py-1 text-xs font-extrabold">
                    +12,4%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border-2 border-black bg-[#b7c6c2] p-4">
                    <p className="text-xs font-bold uppercase">Receitas</p>
                    <p className="font-cabinet text-2xl font-extrabold">
                      R$ 5,2k
                    </p>
                  </div>
                  <div className="rounded-xl border-2 border-black bg-[#171e19] p-4 text-white">
                    <p className="text-xs font-bold uppercase text-[#b7c6c2]">
                      Despesas
                    </p>
                    <p className="font-cabinet text-2xl font-extrabold">
                      R$ 2,8k
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-2 border-black bg-white p-4">
                  <p className="mb-3 text-xs font-bold uppercase text-black/60">
                    Fluxo dos últimos 7 dias
                  </p>
                  <div className="flex h-24 items-end gap-2">
                    {[40, 65, 50, 80, 45, 90, 70].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-md border-2 border-black bg-[#90ff6b]"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border-2 border-black bg-[#90ff6b] p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-white">
                    <MessageCircle className="h-4 w-4" strokeWidth={3} />
                  </div>
                  <p className="text-sm font-bold">
                    &quot;almoço 87&quot; → categorizado
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CAPABILITIES MARQUEE ============ */}
      <section className="overflow-hidden border-b-2 border-black bg-[#171e19] py-8">
        <div className="flex w-max animate-marquee items-center gap-16 whitespace-nowrap">
          {[...capabilities, ...capabilities].map((c, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[#90ff6b] bg-[#171e19]">
                <c.icon className="h-5 w-5 text-[#90ff6b]" strokeWidth={2.5} />
              </div>
              <span className="font-cabinet text-2xl font-extrabold tracking-tight text-[#b7c6c2]">
                {c.label}
              </span>
              <span className="text-3xl font-extrabold text-[#90ff6b]">•</span>
            </div>
          ))}
        </div>
      </section>

      {/* ============ PROBLEM vs SOLUTION ============ */}
      <section className="border-b-2 border-black bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <span className="inline-block rounded-full border-2 border-black bg-[#b7c6c2] px-4 py-1 font-cabinet text-sm font-extrabold">
              O PROBLEMA
            </span>
            <h2 className="mx-auto mt-6 max-w-3xl text-balance font-cabinet text-5xl font-extrabold tracking-tighter sm:text-6xl">
              Você sabe pra{' '}
              <span className="text-stroke">onde</span> foi seu salário?
            </h2>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-3xl border-2 border-dashed border-gray-400 bg-[#f4f4f5] p-10 opacity-70">
              <h3 className="mb-6 font-cabinet text-3xl font-extrabold">
                Hoje, sem o Controlei
              </h3>
              <ul className="space-y-4">
                {[
                  'Você esquece de lançar e perde o controle no dia 10',
                  'Planilha que dá preguiça só de abrir',
                  'Não sabe pra onde foi o salário no fim do mês',
                  'Boleto vencido vira multa porque esqueceu',
                  'Recibos perdidos no meio das fotos do celular',
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-gray-500 bg-white">
                      <X className="h-3 w-3" strokeWidth={4} />
                    </div>
                    <span className="font-medium text-black/70">{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="brutal-shadow rounded-3xl border-2 border-black bg-[#90ff6b] p-10">
              <h3 className="mb-6 font-cabinet text-3xl font-extrabold">
                Com o Controlei
              </h3>
              <ul className="space-y-4">
                {[
                  'Lança em 5 segundos pelo WhatsApp, mesmo no trânsito',
                  'IA categoriza tudo, sem você abrir planilha',
                  'Bot avisa boletos vencendo hoje às 9h da manhã',
                  'Foto do cupom vira lançamento automático',
                  'Saldo e gastos do mês na palma da mão, atualizados agora',
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white">
                      <Check className="h-3 w-3" strokeWidth={4} />
                    </div>
                    <span className="font-bold">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FLUXOGRAMA — Como funciona ============ */}
      <Flowchart />

      {/* ============ ORGANOGRAMA — O que faz ============ */}
      <Organogram />

      {/* ============ TIMELINE — Dia a dia ============ */}
      <DailyTimeline />

      {/* ============ DASHBOARD SHOWCASE ============ */}
      <DashboardShowcase />

      {/* ============ TESTIMONIALS — Prints WhatsApp ============ */}
      <TestimonialsWhatsApp />

      {/* ============ PLANOS ============ */}
      <section id="planos" className="border-b-2 border-black bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <span className="inline-block rounded-full border-2 border-black bg-[#90ff6b] px-4 py-1 font-cabinet text-sm font-extrabold">
              PLANOS
            </span>
            <h2 className="mt-6 text-balance font-cabinet text-5xl font-extrabold tracking-tighter sm:text-6xl">
              Um preço <span className="text-stroke">justo</span>. Zero
              pegadinha.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg font-medium text-black/70">
              3 dias grátis pra testar. Depois escolhe mensal ou anual.
              Cancela quando quiser e leva seus dados.
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border-2 border-black bg-white p-10">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-cabinet text-3xl font-extrabold">Mensal</h3>
                <span className="rounded-full border-2 border-black bg-[#b7c6c2] px-3 py-1 font-cabinet text-xs font-extrabold">
                  FLEXÍVEL
                </span>
              </div>
              <p className="mb-6 font-medium text-black/60">
                Sem compromisso. Pague mês a mês.
              </p>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="font-cabinet text-6xl font-extrabold tracking-tighter">
                  R$ 19,90
                </span>
                <span className="font-bold text-black/60">/mês</span>
              </div>
              <p className="mb-8 text-sm font-medium text-black/60">
                Começa com 3 dias grátis.
              </p>
              <ul className="mb-8 space-y-3">
                {[
                  'Lançamentos ilimitados (texto, áudio, foto, PDF)',
                  'IA classifica automático',
                  '4 relatórios em PDF por mês',
                  'Dashboard com 6 KPIs e 4 gráficos',
                  'Cartão de crédito até 48x',
                  'Multi-usuário (família, sócio, casal)',
                  'Cancele a qualquer momento',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white">
                      <Check className="h-3 w-3" strokeWidth={4} />
                    </div>
                    <span className="font-medium">{t}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="brutal-btn brutal-shadow-sm flex items-center justify-center gap-2 rounded-xl border-2 border-black bg-white px-6 py-4 font-cabinet font-extrabold"
              >
                Começar grátis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div
              className="relative rounded-2xl border-2 border-black bg-[#90ff6b] p-10"
              style={{ boxShadow: '8px 8px 0px 0px #000000' }}
            >
              <span className="absolute -top-3 right-6 rounded-full border-2 border-black bg-black px-3 py-1 font-cabinet text-xs font-extrabold text-[#90ff6b]">
                ECONOMIZE ~16%
              </span>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-cabinet text-3xl font-extrabold">Anual</h3>
                <span className="rounded-full border-2 border-black bg-white px-3 py-1 font-cabinet text-xs font-extrabold">
                  MELHOR VALOR
                </span>
              </div>
              <p className="mb-6 font-bold">
                O melhor custo-benefício. Um pagamento só.
              </p>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="font-cabinet text-6xl font-extrabold tracking-tighter">
                  R$ 199,90
                </span>
                <span className="font-bold">/ano</span>
              </div>
              <p className="mb-8 text-sm font-bold text-black/70">
                equivalente a R$ 16,66/mês
              </p>
              <ul className="mb-8 space-y-3">
                {[
                  'Tudo do plano mensal',
                  'Economize ~16% pagando no ano',
                  'Um pagamento só, sem boletos todo mês',
                  'Suporte prioritário no WhatsApp',
                  'Acesso antecipado a novidades',
                  'Cancele a qualquer momento',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white">
                      <Check className="h-3 w-3" strokeWidth={4} />
                    </div>
                    <span className="font-bold">{t}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="brutal-btn flex items-center justify-center gap-2 rounded-xl border-2 border-black bg-black px-6 py-4 font-cabinet font-extrabold text-white"
                style={{ boxShadow: '4px 4px 0px 0px #000000' }}
              >
                Começar grátis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <p className="mx-auto mt-10 max-w-2xl text-center text-sm font-medium text-black/60">
            Pagamento seguro (cartão ou Pix). Se cancelar, seu acesso
            continua até o fim do período pago.
          </p>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <FAQSection />

      {/* ============ FINAL CTA ============ */}
      <section className="border-b-2 border-black bg-[#90ff6b] py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-balance font-cabinet text-6xl font-extrabold tracking-tighter sm:text-7xl">
            Pare de adivinhar.{' '}
            <span className="text-stroke">Comece</span> a controlar.
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-xl font-medium text-black/80">
            3 dias grátis. Sem cartão. Setup em 3 minutos. Cancela quando
            quiser e leva seus dados.
          </p>
          <div className="mt-12 flex flex-wrap justify-center gap-5">
            <Link
              href="/register"
              className="brutal-btn brutal-shadow inline-flex items-center gap-3 rounded-xl border-2 border-black bg-black px-10 py-6 font-cabinet text-xl font-extrabold text-white"
            >
              Criar conta grátis
              <ArrowRight className="h-6 w-6" />
            </Link>
            <Link
              href="/login"
              className="brutal-btn brutal-shadow-sm inline-flex items-center gap-3 rounded-xl border-2 border-black bg-white px-10 py-6 font-cabinet text-xl font-extrabold"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
