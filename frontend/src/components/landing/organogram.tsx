import {
  Bot,
  Type,
  Mic,
  Image as ImageIcon,
  FileText,
  Wallet,
  Calendar,
  TrendingUp,
  FileDown,
  CreditCard,
  Target,
  Flag,
  Users,
  Sparkles,
} from 'lucide-react';

type Item = {
  icon: typeof Type;
  name: string;
  example: string;
  benefit: string;
};

type Branch = {
  index: string;
  label: string;
  sublabel: string;
  color: string;
  colorRGB: string;
  items: Item[];
};

const branches: Branch[] = [
  {
    index: '01',
    label: 'ENTRADA',
    sublabel: '4 jeitos de registrar gasto',
    color: '#90ff6b',
    colorRGB: '144, 255, 107',
    items: [
      {
        icon: Type,
        name: 'Texto livre',
        example: '"gastei 50 no uber"',
        benefit:
          'Escreve normal, igual conversa com amigo. Aceita "k" pra mil ("recebi 2k"), gírias e abreviações.',
      },
      {
        icon: Mic,
        name: 'Áudio',
        example: '🎤 áudio de 7 segundos',
        benefit:
          'Mãos ocupadas dirigindo, cozinhando? Grava áudio que o bot ouve, entende e registra na hora.',
      },
      {
        icon: ImageIcon,
        name: 'Foto da nota',
        example: '📸 foto do cupom',
        benefit:
          'Foto do cupom do mercado, da farmácia ou da nota fiscal. O bot lê o valor e o local sozinho.',
      },
      {
        icon: FileText,
        name: 'PDF de boleto',
        example: '📎 boleto.pdf',
        benefit:
          'Boleto de energia, internet, condomínio chegou no email? Encaminha pro bot e vira lançamento.',
      },
    ],
  },
  {
    index: '02',
    label: 'CONSULTA',
    sublabel: 'Pergunta no chat, recebe na hora',
    color: '#fde047',
    colorRGB: '253, 224, 71',
    items: [
      {
        icon: Wallet,
        name: 'Saldo das contas',
        example: '"saldo"',
        benefit:
          'Lista o saldo de cada conta bancária separada e o total. Sem precisar abrir 3 apps de banco diferente.',
      },
      {
        icon: Calendar,
        name: 'O que vence essa semana',
        example: '"vencimentos"',
        benefit:
          'Lista dos boletos a pagar nos próximos 7 dias, organizada por data. Pra você se programar sem surpresa.',
      },
      {
        icon: TrendingUp,
        name: 'Resumo do mês',
        example: '"despesas de maio"',
        benefit:
          'Total gasto, número de transações e top 3 categorias que mais comeram seu dinheiro. Entende pra onde foi.',
      },
      {
        icon: FileDown,
        name: 'Relatório em PDF',
        example: '"relatório do mês"',
        benefit:
          'Documento formatado pronto pra guardar, mandar pro contador ou usar na declaração de IR. 4 PDFs por mês inclusos.',
      },
    ],
  },
  {
    index: '03',
    label: 'GESTÃO',
    sublabel: 'Funções que organizam sua vida',
    color: '#fb923c',
    colorRGB: '251, 146, 60',
    items: [
      {
        icon: CreditCard,
        name: 'Cartão até 48x',
        example: 'compra de R$ 2.400 em 12x',
        benefit:
          'Cadastra os cartões com data de fechamento e vencimento. Quando parcela uma compra, o sistema distribui R$ X em cada fatura futura.',
      },
      {
        icon: Target,
        name: 'Orçamento por categoria',
        example: 'Alimentação: R$ 1.000/mês',
        benefit:
          'Define quanto pode gastar em cada categoria. Se você passar de 80% do limite, o bot avisa no zap antes de estourar de vez.',
      },
      {
        icon: Flag,
        name: 'Metas a conquistar',
        example: '"Guardar R$ 5.000 até dezembro"',
        benefit:
          'Define seu objetivo (viagem, reserva de emergência, mimo). Vai adicionando aportes ao longo do tempo e acompanha a barra de progresso até bater 100%.',
      },
      {
        icon: Users,
        name: 'Cadastra outras pessoas',
        example: 'Você + cônjuge + contador',
        benefit:
          'Adicione cônjuge, sócio, contador ou assistente com perfis de permissão diferentes. Cada um manda mensagem do WhatsApp dele e o bot atribui o lançamento à pessoa certa.',
      },
    ],
  },
];

export function Organogram() {
  return (
    <section
      id="funcoes"
      className="relative overflow-hidden border-b-2 border-black bg-[#0a0f0c] py-24 text-white"
    >
      {/* gradient + grid + noise sobrepostos */}
      <div className="absolute inset-0 opacity-60">
        <div
          className="h-full w-full"
          style={{
            background:
              'radial-gradient(ellipse at 20% 0%, rgba(144,255,107,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(251,146,60,0.06) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(253,224,71,0.04) 0%, transparent 60%)',
          }}
        />
      </div>
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>
      <div className="noise-overlay" />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mb-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#90ff6b]/30 bg-[#90ff6b]/5 px-4 py-1.5 font-mono text-xs font-bold text-[#90ff6b] backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 animate-glow-pulse" strokeWidth={2.5} />
            ESTRUTURA DO BOT
          </div>
          <h2 className="mx-auto mt-6 max-w-3xl text-balance font-cabinet text-5xl font-extrabold tracking-tighter sm:text-6xl">
            12 funções organizadas em{' '}
            <span className="shimmer-text">3 ramos</span>.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-medium text-[#b7c6c2]">
            Tudo que você manda pelo zap e tudo que organiza no painel. Visão de árvore pra você bater o olho e entender.
          </p>
        </div>

        {/* CENTRO — bot da Controlei com glow */}
        <div className="mb-10 flex justify-center">
          <div className="relative">
            {/* halo glow externo */}
            <div
              className="absolute -inset-6 rounded-3xl opacity-50 blur-2xl animate-glow-pulse"
              style={{ background: 'radial-gradient(circle, rgba(144,255,107,0.6), transparent 70%)' }}
            />

            <div
              className="relative flex items-center gap-4 rounded-2xl border-[3px] border-[#90ff6b] bg-gradient-to-br from-black via-[#0d130f] to-black px-8 py-5 backdrop-blur-sm"
              style={{
                boxShadow: '0 0 40px rgba(144,255,107,0.4), 6px 6px 0 0 #90ff6b',
              }}
            >
              <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#90ff6b] to-[#7be050]">
                <Bot className="h-7 w-7 text-black" strokeWidth={2.5} />
                {/* ping verde */}
                <span className="absolute -right-1 -top-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#90ff6b] opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-[#90ff6b] ring-2 ring-black" />
                </span>
              </div>
              <div>
                <p className="font-cabinet text-2xl font-extrabold text-[#90ff6b]">
                  Controlei Bot
                </p>
                <p className="font-mono text-xs font-bold text-white/60">
                  (21) 98312-8245 · sempre online
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CONECTORES SVG animados — desktop */}
        <div className="hidden lg:block">
          <svg
            className="mx-auto block"
            width="900"
            height="100"
            viewBox="0 0 900 100"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#90ff6b" />
                <stop offset="50%" stopColor="#fde047" />
                <stop offset="100%" stopColor="#fb923c" />
              </linearGradient>
            </defs>
            {/* tronco descendo */}
            <line x1="450" y1="0" x2="450" y2="35" stroke="#90ff6b" strokeWidth="3" />
            {/* barra horizontal com gradient */}
            <line x1="150" y1="35" x2="750" y2="35" stroke="url(#line-grad)" strokeWidth="3" />
            {/* 3 ramos descendo com cores certas */}
            <line x1="150" y1="35" x2="150" y2="100" stroke="#90ff6b" strokeWidth="3" strokeDasharray="6 4" className="animate-dash-flow" />
            <line x1="450" y1="35" x2="450" y2="100" stroke="#fde047" strokeWidth="3" strokeDasharray="6 4" className="animate-dash-flow" />
            <line x1="750" y1="35" x2="750" y2="100" stroke="#fb923c" strokeWidth="3" strokeDasharray="6 4" className="animate-dash-flow" />
            {/* pontas com glow */}
            <circle cx={450} cy={0} r="6" fill="#90ff6b">
              <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx={150} cy={35} r="6" fill="#90ff6b" />
            <circle cx={450} cy={35} r="6" fill="#fde047" />
            <circle cx={750} cy={35} r="6" fill="#fb923c" />
          </svg>
        </div>

        {/* 3 RAMOS */}
        <div className="grid items-start gap-8 lg:grid-cols-3">
          {branches.map((b, bi) => (
            <div key={bi} className="flex h-full flex-col">
              {/* Header do ramo com gradient + glow */}
              <div
                className="relative mb-6 overflow-hidden rounded-2xl border-2 border-black p-5 text-center"
                style={{
                  background: `linear-gradient(135deg, ${b.color}, ${b.color}dd)`,
                  boxShadow: `0 0 30px rgba(${b.colorRGB},0.3), 4px 4px 0 0 #000`,
                  color: '#000',
                }}
              >
                {/* shine effect diagonal */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-30"
                  style={{
                    background:
                      'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)',
                  }}
                />
                <div className="relative">
                  <div className="mb-1 flex items-center justify-center gap-2">
                    <span className="font-mono text-[10px] font-bold tracking-widest opacity-60">
                      RAMO {b.index}
                    </span>
                  </div>
                  <p className="font-cabinet text-2xl font-extrabold uppercase tracking-tight">
                    {b.label}
                  </p>
                  <p className="text-sm font-bold opacity-80">{b.sublabel}</p>
                </div>
              </div>

              {/* linha vertical com gradient */}
              <div
                className="mx-auto mb-3 h-6 w-1 rounded-full"
                style={{ background: `linear-gradient(${b.color}, transparent)` }}
              />

              {/* Items — cards modernos com glow */}
              <div className="flex flex-1 flex-col gap-3">
                {b.items.map((item, i) => (
                  <div
                    key={i}
                    className="group card-lift relative overflow-hidden rounded-xl border border-[#272727] bg-gradient-to-br from-[#0d130f] to-[#0a0f0c] p-5"
                    style={{ '--glow': b.color } as React.CSSProperties}
                  >
                    {/* gradient overlay sutil que aparece no hover */}
                    <div
                      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                      style={{
                        background: `radial-gradient(circle at top right, rgba(${b.colorRGB},0.15), transparent 60%)`,
                      }}
                    />

                    {/* border glow no hover */}
                    <div
                      className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                      style={{ boxShadow: `inset 0 0 0 1px rgba(${b.colorRGB},0.5)` }}
                    />

                    <div className="relative">
                      {/* header com ícone + nome + número */}
                      <div className="mb-3 flex items-center gap-3">
                        <div
                          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 border-black"
                          style={{
                            background: `linear-gradient(135deg, ${b.color}, ${b.color}cc)`,
                            boxShadow: `0 4px 12px rgba(${b.colorRGB},0.4)`,
                          }}
                        >
                          <item.icon className="h-5 w-5 text-black" strokeWidth={2.5} />
                          {/* highlight no canto */}
                          <span className="absolute left-1 top-1 h-2 w-2 rounded-full bg-white/40" />
                        </div>
                        <div className="flex-1">
                          <p className="font-cabinet text-lg font-extrabold leading-tight text-white">
                            {item.name}
                          </p>
                          <span
                            className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-50"
                            style={{ color: b.color }}
                          >
                            {b.index}.{String(i + 1).padStart(2, '0')}
                          </span>
                        </div>
                      </div>

                      {/* exemplo estilo terminal */}
                      <div
                        className="mb-3 rounded-lg border bg-black/40 px-3 py-2 backdrop-blur-sm"
                        style={{ borderColor: `rgba(${b.colorRGB},0.2)` }}
                      >
                        <div className="mb-1 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#ff5f57]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-[#febc2e]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-[#28c840]" />
                          <span className="ml-1 font-mono text-[9px] font-bold uppercase tracking-widest text-white/40">
                            exemplo
                          </span>
                        </div>
                        <p
                          className="font-mono text-sm font-bold"
                          style={{ color: b.color }}
                        >
                          {item.example}
                        </p>
                      </div>

                      {/* benefício */}
                      <p className="text-sm font-medium leading-relaxed text-[#b7c6c2]">
                        {item.benefit}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Rodapé com status badges modernos */}
        <div className="relative mt-12 overflow-hidden rounded-2xl border border-[#272727] bg-gradient-to-br from-[#0d130f] to-[#0a0f0c] p-6">
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              background:
                'radial-gradient(circle at 0% 50%, rgba(144,255,107,0.3), transparent 30%), radial-gradient(circle at 100% 50%, rgba(251,146,60,0.3), transparent 30%)',
            }}
          />
          <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#90ff6b] opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-[#90ff6b]" />
              </span>
              <p className="font-mono text-sm font-bold text-white">
                Mais <span className="text-[#90ff6b]">2 rotinas</span> automáticas que rodam sozinhas:
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <span
                className="rounded-full border px-3 py-1 font-bold text-[#90ff6b] backdrop-blur-sm"
                style={{ borderColor: 'rgba(144,255,107,0.4)', background: 'rgba(144,255,107,0.08)' }}
              >
                🔔 09h: Boletos vencendo hoje
              </span>
              <span
                className="rounded-full border px-3 py-1 font-bold text-[#fb923c] backdrop-blur-sm"
                style={{ borderColor: 'rgba(251,146,60,0.4)', background: 'rgba(251,146,60,0.08)' }}
              >
                ⚠️ 08h: Alerta de orçamento
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
