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
  { icon: Type, label: 'TEXTO LIVRE' },
  { icon: Brain, label: 'IA CLASSIFICADORA' },
  { icon: Receipt, label: 'LANÇAMENTO AUTOMÁTICO' },
  { icon: BarChart3, label: 'DASHBOARD EM TEMPO REAL' },
  { icon: FileText, label: 'RELATÓRIO PRONTO' },
  { icon: Bot, label: 'BOT 24/7' },
  { icon: Sparkles, label: 'ZERO PLANILHA' },
];

const features = [
  {
    icon: MessageCircle,
    title: 'Lançamento por WhatsApp',
    text: 'Mande "almoço cliente 87 reais" no WhatsApp. A IA categoriza, salva e te devolve o saldo do dia.',
  },
  {
    icon: Brain,
    title: 'IA que entende contabilidade',
    text: 'Classificação automática de receitas e despesas em segmentos e categorias do seu negócio.',
  },
  {
    icon: PieChart,
    title: 'Dashboards em tempo real',
    text: 'Fluxo de caixa, DRE simplificado e gráficos que abrem na hora — sem fechar mês manualmente.',
  },
  {
    icon: Receipt,
    title: 'Comprovantes e fotos',
    text: 'Mande a foto da nota fiscal pelo WhatsApp. O bot extrai valor, data e categoria.',
  },
  {
    icon: ShieldCheck,
    title: 'Multi-empresa, multi-acesso',
    text: 'Gerencie várias empresas em uma conta. Permissões por usuário e log de auditoria completo.',
  },
  {
    icon: Zap,
    title: 'Setup em 3 minutos',
    text: 'Conecte WhatsApp, importe categorias prontas pro seu segmento e comece a lançar agora.',
  },
];

export default function LandingPage() {
  return (
    <div className="font-satoshi text-black bg-white min-h-screen">
      {/* ============ NAV ============ */}
      <header className="sticky top-0 z-50 h-20 border-b-2 border-black bg-[#90ff6b]">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-2 border-black bg-black">
              <Zap className="h-5 w-5 fill-[#90ff6b] text-[#90ff6b]" />
            </div>
            <span className="font-cabinet text-2xl font-extrabold">
              MeuCaixa
            </span>
          </Link>

          <nav className="hidden items-center gap-10 md:flex">
            <a href="#features" className="font-bold hover:underline">
              Recursos
            </a>
            <a href="#how" className="font-bold hover:underline">
              Como funciona
            </a>
            <a href="#personas" className="font-bold hover:underline">
              Para quem
            </a>
            <a href="#depoimentos" className="font-bold hover:underline">
              Depoimentos
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden font-bold hover:underline sm:inline"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="brutal-btn brutal-shadow-sm inline-flex items-center gap-2 rounded-xl border-2 border-black bg-black px-5 py-3 font-cabinet font-extrabold text-white"
            >
              Começar grátis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden border-b-2 border-black bg-[#90ff6b]">
        <div className="absolute inset-0 dot-pattern opacity-10" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-24 lg:grid-cols-2 lg:py-32">
          {/* Left */}
          <div className="flex flex-col items-center justify-center text-center">
            <span className="mb-8 inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-5 py-2 font-cabinet text-sm font-bold">
              <span className="h-2 w-2 rounded-full bg-black" />
              NOVO: IA Classificadora 2.0
            </span>

            <h1 className="text-balance font-cabinet text-6xl font-extrabold leading-[0.95] tracking-tighter sm:text-7xl lg:text-8xl">
              Seu caixa{' '}
              <span className="text-stroke">vive</span> no WhatsApp.
            </h1>

            <p className="mt-8 max-w-xl text-balance text-xl font-medium text-black/80">
              Lance despesas e receitas mandando mensagem. A IA categoriza,
              o dashboard atualiza e o seu contador sorri. Zero planilha,
              zero atraso.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-5">
              <Link
                href="/register"
                className="brutal-btn brutal-shadow inline-flex items-center gap-3 rounded-xl border-2 border-black bg-black px-8 py-5 font-cabinet text-lg font-extrabold text-white"
              >
                Começar grátis
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#how"
                className="brutal-btn brutal-shadow-sm inline-flex items-center gap-3 rounded-xl border-2 border-black bg-white px-8 py-5 font-cabinet text-lg font-extrabold text-black"
              >
                Ver como funciona
              </a>
            </div>

            <div className="mt-10 flex items-center gap-6 text-sm font-bold">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5" strokeWidth={3} />
                14 dias grátis
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
              className="w-full max-w-xl rounded-2xl border-2 border-black bg-white"
              style={{ boxShadow: '12px 12px 0px 0px #000000' }}
            >
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
            14 dias grátis. Sem cartão. Setup em 3 minutos. Cancela quando
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
