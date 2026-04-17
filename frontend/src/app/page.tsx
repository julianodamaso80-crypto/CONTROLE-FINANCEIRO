import { HeroLightRays } from '@/components/shared/hero-light-rays';
import Image from 'next/image';
import Link from 'next/link';
import {
  Zap,
  MessageCircle,
  Brain,
  PieChart,
  Receipt,
  ShieldCheck,
  Check,
  X,
  Star,
  ArrowRight,
  Twitter,
  Instagram,
  Linkedin,
  Github,
  Mic,
  Image as ImageIcon,
  Type,
  Sparkles,
  FileText,
  BarChart3,
  Bot,
} from 'lucide-react';

export const metadata = {
  title: 'MeuCaixa — Controle financeiro empresarial via WhatsApp',
  description:
    'Lance receitas, despesas e categorias falando no WhatsApp. IA classifica tudo, dashboards em tempo real e zero planilha.',
};

const capabilities = [
  { icon: Mic, label: 'ÁUDIO NO WHATSAPP' },
  { icon: ImageIcon, label: 'FOTO DA NOTA' },
  { icon: FileText, label: 'PDF DE BOLETO/EXTRATO' },
  { icon: Type, label: 'TEXTO LIVRE' },
  { icon: Brain, label: 'IA CLASSIFICADORA' },
  { icon: Receipt, label: 'LANÇAMENTO AUTOMÁTICO' },
  { icon: BarChart3, label: 'DASHBOARD EM TEMPO REAL' },
  { icon: FileText, label: 'RELATÓRIO MENSAL EM PDF' },
  { icon: Bot, label: 'BOT 24/7' },
  { icon: Sparkles, label: 'ZERO PLANILHA' },
];

const features = [
  {
    icon: Type,
    title: 'Texto livre no WhatsApp',
    text: 'Mande "almoço cliente 87 reais". A IA entende português informal, gírias e abreviações — categoriza, salva e devolve o saldo.',
  },
  {
    icon: Mic,
    title: 'Áudio também funciona',
    text: 'Sem tempo pra digitar? Manda um áudio de 5 segundos. O bot transcreve, classifica e lança na hora.',
  },
  {
    icon: ImageIcon,
    title: 'Foto da nota fiscal',
    text: 'Tirou foto do comprovante? Manda. O bot lê valor, data, descrição e já registra a despesa.',
  },
  {
    icon: FileText,
    title: 'PDF de boleto ou extrato',
    text: 'Recebeu um boleto, nota fiscal eletrônica ou extrato em PDF? Encaminha pro bot — ele extrai tudo.',
  },
  {
    icon: BarChart3,
    title: 'Relatório mensal em PDF',
    text: 'Peça "relatório do mês" no WhatsApp e receba um PDF profissional pronto pra mandar pro contador. Até 4 por mês.',
  },
  {
    icon: PieChart,
    title: 'Dashboards em tempo real',
    text: 'Fluxo de caixa, gráficos por categoria e saldo atualizado na hora — sem fechar mês manualmente.',
  },
];

export default function LandingPage() {
  return (
    <div className="font-satoshi text-black bg-white min-h-screen">
      {/* ============ NAV ============ */}
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

          <nav className="hidden items-center gap-10 md:flex">
            <a href="#features" className="font-bold text-[#90ff6b] hover:underline">
              Recursos
            </a>
            <a href="#how" className="font-bold text-[#90ff6b] hover:underline">
              Como funciona
            </a>
            <a href="#planos" className="font-bold text-[#90ff6b] hover:underline">
              Planos
            </a>
            <a href="#depoimentos" className="font-bold text-[#90ff6b] hover:underline">
              Depoimentos
            </a>
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
              className="brutal-btn inline-flex items-center gap-2 rounded-xl border-2 border-[#90ff6b] bg-[#90ff6b] px-5 py-3 font-cabinet font-extrabold text-black"
            >
              Começar grátis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden border-b-2 border-black bg-[#171e19]">
        <HeroLightRays />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-24 lg:grid-cols-2 lg:py-32">
          {/* Left */}
          <div className="flex flex-col items-center justify-center text-center text-white">
            <span className="mb-8 inline-flex items-center gap-2 rounded-full border-2 border-[#90ff6b]/40 bg-[#90ff6b]/10 px-5 py-2 font-cabinet text-sm font-bold text-[#90ff6b]">
              <span className="h-2 w-2 rounded-full bg-[#90ff6b]" />
              NOVO: IA Classificadora 2.0
            </span>

            <h1 className="text-balance font-cabinet text-6xl font-extrabold leading-[0.95] tracking-tighter sm:text-7xl lg:text-8xl">
              Seu caixa{' '}
              <span style={{ WebkitTextStroke: '2px #90ff6b', color: 'transparent' }}>vive</span> no WhatsApp.
            </h1>

            <p className="mt-8 max-w-xl text-balance text-xl font-medium text-white/70">
              Lance despesas e receitas por <strong className="text-white">texto, áudio, foto da nota ou PDF de boleto</strong>.
              A IA categoriza tudo e ainda gera seu <strong className="text-white">relatório mensal em PDF</strong> —
              direto no WhatsApp.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-5">
              <Link
                href="/register"
                className="brutal-btn inline-flex items-center gap-3 rounded-xl border-2 border-[#90ff6b] bg-[#90ff6b] px-8 py-5 font-cabinet text-lg font-extrabold text-black"
                style={{ boxShadow: '4px 4px 0px 0px #90ff6b' }}
              >
                Começar grátis
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#how"
                className="brutal-btn inline-flex items-center gap-3 rounded-xl border-2 border-white/20 bg-white/5 px-8 py-5 font-cabinet text-lg font-extrabold text-white backdrop-blur-sm"
                style={{ boxShadow: '4px 4px 0px 0px rgba(255,255,255,0.1)' }}
              >
                Ver como funciona
              </a>
            </div>

            <div className="mt-10 flex items-center gap-6 text-sm font-bold text-[#90ff6b]">
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

          {/* Right — Browser mockup */}
          <div className="relative flex items-center justify-center">
            <div
              className="relative w-full max-w-xl rounded-2xl border-2 border-black bg-white"
              style={{ boxShadow: '12px 12px 0px 0px #000000' }}
            >
              {/* Floating stamp — Relatório mensal em PDF */}
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

              {/* browser header */}
              <div className="flex items-center gap-2 rounded-t-2xl border-b-2 border-black bg-black px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <div className="h-3 w-3 rounded-full bg-[#b7c6c2]" />
                <div className="h-3 w-3 rounded-full bg-[#28c840]" />
                <div className="ml-4 flex-1 rounded-md border border-white/20 bg-[#171e19] px-3 py-1 text-xs font-bold text-[#b7c6c2]">
                  app.meucaixa.store/dashboard
                </div>
              </div>

              {/* dashboard content */}
              <div className="grid gap-4 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase text-black/60">
                      Saldo do mês
                    </p>
                    <p className="font-cabinet text-4xl font-extrabold">
                      R$ 47.820
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
                      R$ 82.4k
                    </p>
                  </div>
                  <div className="rounded-xl border-2 border-black bg-[#171e19] p-4 text-white">
                    <p className="text-xs font-bold uppercase text-[#b7c6c2]">
                      Despesas
                    </p>
                    <p className="font-cabinet text-2xl font-extrabold">
                      R$ 34.6k
                    </p>
                  </div>
                </div>

                {/* fake bar chart */}
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
                    "almoço cliente 87" → categorizado
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
              Planilha não é controle. É <span className="text-stroke">caos</span>{' '}
              organizado.
            </h2>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Problem */}
            <div className="rounded-3xl border-2 border-dashed border-gray-400 bg-[#f4f4f5] p-10 opacity-70">
              <h3 className="mb-6 font-cabinet text-3xl font-extrabold">
                Sem o MeuCaixa
              </h3>
              <ul className="space-y-4">
                {[
                  'Você esquece de lançar e perde o controle no dia 10',
                  'Planilha gigante que ninguém entende além de você',
                  'Contador cobra extra pra organizar a bagunça',
                  'Decide no achismo porque o número nunca está pronto',
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

            {/* Solution */}
            <div className="brutal-shadow rounded-3xl border-2 border-black bg-[#90ff6b] p-10">
              <h3 className="mb-6 font-cabinet text-3xl font-extrabold">
                Com o MeuCaixa
              </h3>
              <ul className="space-y-4">
                {[
                  'Lança em 5 segundos pelo WhatsApp, mesmo no trânsito',
                  'IA categoriza tudo e mantém o livro caixa pronto',
                  'Contador recebe o relatório fechado todo mês',
                  'Decisão com número real, atualizado agora',
                  'Foto do recibo vira lançamento automático',
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

      {/* ============ FEATURE GRID ============ */}
      <section
        id="features"
        className="border-b-2 border-black bg-[#90ff6b] py-24"
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <span className="inline-block rounded-full border-2 border-black bg-white px-4 py-1 font-cabinet text-sm font-extrabold">
              RECURSOS
            </span>
            <h2 className="mt-6 text-balance font-cabinet text-5xl font-extrabold tracking-tighter sm:text-6xl">
              Tudo que você precisa.{' '}
              <span className="text-stroke">Nada</span> que você não precisa.
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={i}
                className="feature-card brutal-shadow-sm rounded-2xl border-2 border-black bg-white p-7"
              >
                <div className="feature-icon-box mb-6 flex h-16 w-16 items-center justify-center rounded-xl border-2 border-black">
                  <f.icon className="h-7 w-7" strokeWidth={2.5} />
                </div>
                <h3 className="mb-3 font-cabinet text-2xl font-extrabold">
                  {f.title}
                </h3>
                <p className="font-medium text-black/70">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section
        id="how"
        className="border-b-2 border-black bg-[#171e19] py-24 text-white"
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-20 text-center">
            <span className="inline-block rounded-full border-2 border-[#b7c6c2] bg-[#171e19] px-4 py-1 font-cabinet text-sm font-extrabold text-[#b7c6c2]">
              COMO FUNCIONA
            </span>
            <h2 className="mx-auto mt-6 max-w-3xl text-balance font-cabinet text-5xl font-extrabold tracking-tighter sm:text-6xl">
              Três passos. Zero{' '}
              <span
                className="text-transparent"
                style={{ WebkitTextStroke: '2px #90ff6b' }}
              >
                burocracia
              </span>
              .
            </h2>
          </div>

          <div className="relative grid gap-12 lg:grid-cols-3">
            {/* connecting line */}
            <div className="absolute left-0 right-0 top-12 hidden h-0.5 bg-[#272727] lg:block" />

            {[
              {
                n: '01',
                color: '#b7c6c2',
                title: 'Conecte seu WhatsApp',
                text: 'QR code em 30 segundos. O bot já entende português, gírias e abreviações.',
              },
              {
                n: '02',
                color: '#90ff6b',
                title: 'Lance falando',
                text: '"Pix do fornecedor 1.200" — a IA classifica, salva e devolve confirmação.',
              },
              {
                n: '03',
                color: '#ffffff',
                title: 'Decida com clareza',
                text: 'Dashboard em tempo real, relatórios prontos e seu contador feliz.',
              },
            ].map((s, i) => (
              <div key={i} className="relative flex flex-col items-center text-center">
                <div
                  className="relative z-10 mb-6 flex h-24 w-24 items-center justify-center rounded-full border-[6px] bg-[#171e19] font-cabinet text-3xl font-extrabold"
                  style={{ borderColor: s.color, color: s.color }}
                >
                  {s.n}
                </div>
                <h3 className="mb-3 font-cabinet text-2xl font-extrabold">
                  {s.title}
                </h3>
                <p className="max-w-xs font-medium text-[#b7c6c2]">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PERSONAS ============ */}
      <section id="personas" className="border-b-2 border-black bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <span className="inline-block rounded-full border-2 border-black bg-[#b7c6c2] px-4 py-1 font-cabinet text-sm font-extrabold">
              PARA QUEM
            </span>
            <h2 className="mt-6 text-balance font-cabinet text-5xl font-extrabold tracking-tighter sm:text-6xl">
              Feito pra quem tem{' '}
              <span className="text-stroke">negócio</span> pra tocar.
            </h2>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Card 1 — Sage */}
            <div className="rounded-2xl border-2 border-black bg-[#b7c6c2] p-8">
              <span className="mb-6 inline-block rounded-full border-2 border-black bg-white px-4 py-1 font-cabinet text-xs font-extrabold">
                PRESTADOR DE SERVIÇO
              </span>
              <h3 className="mb-3 font-cabinet text-3xl font-extrabold">
                Cabeleireiro, advogado, designer
              </h3>
              <p className="font-medium">
                Recebeu pix? Manda no WhatsApp. Comprou material? Mesma coisa.
                Final do mês: relatório pronto.
              </p>
            </div>

            {/* Card 2 — Yellow shadow */}
            <div className="brutal-shadow rounded-2xl border-2 border-black bg-[#90ff6b] p-8">
              <span className="mb-6 inline-block rounded-full border-2 border-black bg-white px-4 py-1 font-cabinet text-xs font-extrabold">
                PEQUENO COMÉRCIO
              </span>
              <h3 className="mb-3 font-cabinet text-3xl font-extrabold">
                Loja, mercado, restaurante
              </h3>
              <p className="font-medium">
                Caixa do dia, despesas com fornecedor e DRE simplificado.
                Vários funcionários lançando ao mesmo tempo.
              </p>
            </div>

            {/* Card 3 — Dark */}
            <div className="rounded-2xl border-2 border-black bg-[#272727] p-8 text-white">
              <span className="mb-6 inline-block rounded-full border-2 border-black bg-white px-4 py-1 font-cabinet text-xs font-extrabold text-black">
                MULTI-EMPRESA
              </span>
              <h3 className="mb-3 font-cabinet text-3xl font-extrabold">
                Holding, contador, franqueado
              </h3>
              <p className="font-medium text-[#b7c6c2]">
                Várias empresas em uma única conta. Permissões granulares e
                log de auditoria pra cada lançamento.
              </p>
            </div>
          </div>
        </div>
      </section>

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
            {/* Mensal */}
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
                  'Despesas e receitas ilimitadas',
                  'WhatsApp: texto, áudio, foto e PDF',
                  'Até 4 relatórios em PDF por mês',
                  'Dashboards em tempo real',
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

            {/* Anual — destaque */}
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
                  'Um pagamento só — sem boletos todo mês',
                  'Até 4 relatórios em PDF por mês',
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
            Pagamento seguro via Asaas (cartão ou Pix). Se cancelar, seu
            acesso continua até o fim do período pago.
          </p>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section
        id="depoimentos"
        className="border-b-2 border-black bg-[#b7c6c2] py-24"
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <span className="inline-block rounded-full border-2 border-black bg-white px-4 py-1 font-cabinet text-sm font-extrabold">
              DEPOIMENTOS
            </span>
            <h2 className="mx-auto mt-6 max-w-3xl text-balance font-cabinet text-5xl font-extrabold tracking-tighter sm:text-6xl">
              Quem usa, não{' '}
              <span className="text-stroke">larga</span>.
            </h2>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {[
              {
                name: 'Marina S.',
                role: 'Dona de barbearia, SP',
                text: 'Eu odiava planilha. Agora lanço tudo no WhatsApp em 3 segundos enquanto atendo o cliente. Mudou meu mês.',
              },
              {
                name: 'Rodrigo L.',
                role: 'Restaurante, BH',
                text: 'Meu contador implorou pra eu não cancelar. Os relatórios chegam fechados, ele só confere e bate o martelo.',
              },
              {
                name: 'Camila V.',
                role: 'Designer freelancer',
                text: 'Foto do recibo vira lançamento. IA categoriza certinho. Pareço uma empresa séria pela primeira vez.',
              },
            ].map((t, i) => (
              <div
                key={i}
                className="border-2 border-black bg-white p-8"
                style={{
                  borderRadius: '2px 1.5rem 2px 1.5rem',
                  boxShadow: '6px 6px 0px 0px #000000',
                }}
              >
                <div className="mb-4 flex gap-1">
                  {[...Array(5)].map((_, j) => (
                    <Star
                      key={j}
                      className="h-5 w-5 fill-black text-black"
                    />
                  ))}
                </div>
                <p className="mb-6 font-medium text-black">"{t.text}"</p>
                <div className="border-t-2 border-black pt-4">
                  <p className="font-cabinet font-extrabold">{t.name}</p>
                  <p className="text-sm font-medium text-black/60">
                    {t.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

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

      {/* ============ FOOTER ============ */}
      <footer className="bg-[#171e19] py-16 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link href="/" className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center border-2 border-[#90ff6b] bg-[#90ff6b]">
                  <Zap className="h-5 w-5 fill-black text-black" />
                </div>
                <span className="font-cabinet text-2xl font-extrabold">
                  MeuCaixa
                </span>
              </Link>
              <p className="mt-4 max-w-xs font-medium text-[#b7c6c2]">
                Controle financeiro empresarial pelo WhatsApp. Feito no
                Brasil, pra quem tem negócio pra tocar.
              </p>
            </div>

            {[
              {
                title: 'Produto',
                links: ['Recursos', 'Como funciona', 'Preços', 'Mudanças'],
              },
              {
                title: 'Empresa',
                links: ['Sobre', 'Blog', 'Contato', 'Carreiras'],
              },
              {
                title: 'Legal',
                links: ['Termos', 'Privacidade', 'LGPD', 'Cookies'],
              },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="mb-4 font-cabinet text-lg font-extrabold">
                  {col.title}
                </h4>
                <ul className="space-y-3">
                  {col.links.map((l) => (
                    <li key={l}>
                      <a
                        href="#"
                        className="font-medium text-[#b7c6c2] hover:text-[#90ff6b]"
                      >
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-16 flex flex-col items-start justify-between gap-6 border-t border-[#272727] pt-8 md:flex-row md:items-center">
            <p className="text-sm font-medium text-[#b7c6c2]">
              © 2026 MeuCaixa. Todos os direitos reservados.
            </p>
            <div className="flex gap-3">
              {[Twitter, Instagram, Linkedin, Github].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-md border-2 border-[#272727] bg-[#272727] text-[#b7c6c2] transition-colors hover:border-[#90ff6b] hover:bg-[#90ff6b] hover:text-black"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
