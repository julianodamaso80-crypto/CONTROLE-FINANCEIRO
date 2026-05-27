import {
  AlertTriangle,
  Bell,
  ImageIcon,
  Wallet,
  Mic,
  FileText,
  CheckCheck,
} from 'lucide-react';

type Moment = {
  time: string;
  icon: typeof AlertTriangle;
  color: string;
  colorRGB: string;
  badge: string;
  title: string;
  desc: string;
  chat: {
    from: 'bot' | 'user';
    text: string;
    reply?: string;
  };
};

const moments: Moment[] = [
  {
    time: '08:00',
    icon: AlertTriangle,
    color: '#fb923c',
    colorRGB: '251, 146, 60',
    badge: 'AUTOMÁTICO',
    title: 'Alerta de orçamento no zap',
    desc: 'Bot acorda você com aviso se algum orçamento passou de 80% ou estourou.',
    chat: {
      from: 'bot',
      text: '⚠️ *Atenção: Alimentação*\n\nVocê já usou 87% do orçamento\n(R$ 870 de R$ 1.000)\nR$ 130 pra fechar o mês',
    },
  },
  {
    time: '09:00',
    icon: Bell,
    color: '#90ff6b',
    colorRGB: '144, 255, 107',
    badge: 'AUTOMÁTICO',
    title: 'Boletos vencendo hoje',
    desc: 'Lista dos boletos do dia chega antes do banco abrir.',
    chat: {
      from: 'bot',
      text: '🔔 *Vence HOJE (3)*\n\n• Aluguel — R$ 1.450\n• Fatura Nubank — R$ 890\n• Energia — R$ 230\n\nTotal: R$ 2.570',
    },
  },
  {
    time: '12:30',
    icon: ImageIcon,
    color: '#fde047',
    colorRGB: '253, 224, 71',
    badge: 'VOCÊ MANDA',
    title: 'Foto do cupom no zap',
    desc: 'Almoço, mercado, farmácia. Foto do cupom vira lançamento.',
    chat: {
      from: 'user',
      text: '[foto do cupom do mercado]',
      reply:
        '✅ *Despesa registrada!*\n\n💵 R$ 127,40\n📦 Alimentação > Mercado\n📅 Hoje, 27/05',
    },
  },
  {
    time: '15:00',
    icon: Wallet,
    color: '#a78bfa',
    colorRGB: '167, 139, 250',
    badge: 'VOCÊ PERGUNTA',
    title: 'Consulta saldo no zap',
    desc: 'Antes de comprar algo, manda "saldo" pra confirmar se cabe.',
    chat: {
      from: 'user',
      text: 'saldo',
      reply:
        '🏦 *Saldo das suas contas*\n\n• Itaú: R$ 2.450,00\n• Nubank: R$ 1.200,00\n• Carteira: R$ 130,00\n\n*Total: R$ 3.780,00*',
    },
  },
  {
    time: '18:00',
    icon: Mic,
    color: '#0EA5E9',
    colorRGB: '14, 165, 233',
    badge: 'VOCÊ MANDA',
    title: 'Áudio com a despesa do dia',
    desc: 'Saindo do trabalho com mãos ocupadas? Manda áudio.',
    chat: {
      from: 'user',
      text: '[áudio 7s]',
      reply:
        '🎤 _Ouvi: "gastei 38 reais no uber agora"_\n\n💸 *Despesa registrada!*\n\n💵 R$ 38,00\n🚗 Transporte > Uber',
    },
  },
  {
    time: '20:00',
    icon: FileText,
    color: '#ff6b9d',
    colorRGB: '255, 107, 157',
    badge: 'VOCÊ PEDE',
    title: 'Relatório do mês em PDF',
    desc: 'Fim do mês ou pra organizar IR — pede relatório no chat.',
    chat: {
      from: 'user',
      text: 'relatório do mês em pdf',
      reply:
        '📊 *Maio/2026*\n\nReceita: R$ 5.200,00\nDespesa: R$ 2.840,00\nSaldo: R$ 2.360,00\n\n📎 relatorio-maio-2026.pdf',
    },
  },
];

export function DailyTimeline() {
  return (
    <section
      id="dia-a-dia"
      className="relative overflow-hidden border-b-2 border-black bg-gradient-to-b from-white via-[#fafafa] to-white py-24"
    >
      {/* background mesh */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            'radial-gradient(ellipse at 0% 0%, rgba(167,139,250,0.06), transparent 50%), radial-gradient(ellipse at 100% 100%, rgba(144,255,107,0.06), transparent 50%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-[#a78bfa] px-4 py-1.5 font-mono text-xs font-extrabold text-white shadow-[3px_3px_0_0_#000]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            UM DIA COM MEUCAIXA
          </div>
          <h2 className="mx-auto mt-6 max-w-3xl text-balance font-cabinet text-5xl font-extrabold tracking-tighter sm:text-6xl">
            6 momentos. Você lembra de{' '}
            <span className="text-stroke">zero</span> deles.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-medium text-black/70">
            Os 2 primeiros chegam sozinhos no seu zap. Os outros 4 são você mandando mensagem normal igual já faz com qualquer um.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* linha vertical com gradient e shimmer */}
          <div
            className="absolute bottom-0 left-[63px] top-0 w-1 rounded-full"
            style={{
              background:
                'linear-gradient(180deg, #fb923c 0%, #90ff6b 18%, #fde047 36%, #a78bfa 54%, #0EA5E9 72%, #ff6b9d 100%)',
            }}
          />

          <div className="space-y-8 lg:space-y-12">
            {moments.map((m, i) => (
              <div key={i} className="relative pl-[160px]">
                {/* Bolinha do tempo à esquerda com glow colorido */}
                <div className="absolute left-0 top-0 z-10 flex flex-col items-center gap-2">
                  {/* glow externo pulsante */}
                  <div
                    className="absolute -inset-2 rounded-3xl opacity-40 blur-xl"
                    style={{ backgroundColor: m.color }}
                  />

                  <div
                    className="relative flex h-[128px] w-[128px] shrink-0 items-center justify-center rounded-2xl border-[3px] border-black"
                    style={{
                      background: `linear-gradient(135deg, ${m.color}, ${m.color}dd)`,
                      boxShadow: `0 0 30px rgba(${m.colorRGB},0.4), 4px 4px 0 0 #000`,
                    }}
                  >
                    {/* shine diagonal */}
                    <div
                      className="pointer-events-none absolute inset-0 rounded-2xl opacity-40"
                      style={{
                        background:
                          'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)',
                      }}
                    />
                    <m.icon className="relative h-11 w-11 text-black" strokeWidth={2.5} />
                    {/* status dot */}
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-black opacity-40" />
                      <span
                        className="relative inline-flex h-4 w-4 rounded-full border-2 border-black"
                        style={{ backgroundColor: m.color }}
                      />
                    </span>
                  </div>

                  {/* horário em destaque */}
                  <div
                    className="relative rounded-lg border-2 border-black bg-white px-3 py-1"
                    style={{ boxShadow: '2px 2px 0 0 #000' }}
                  >
                    <p className="font-mono text-base font-extrabold tracking-tight text-black">
                      {m.time}
                    </p>
                  </div>
                </div>

                {/* Conteúdo */}
                <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
                  {/* Card info com glow + gradient + hover lift */}
                  <div
                    className="group card-lift relative flex flex-col overflow-hidden rounded-2xl border-2 border-black bg-white p-6"
                    style={{ boxShadow: '4px 4px 0 0 #000' }}
                  >
                    {/* gradient sutil de fundo da cor */}
                    <div
                      className="pointer-events-none absolute inset-0 opacity-50"
                      style={{
                        background: `radial-gradient(ellipse at top right, rgba(${m.colorRGB},0.08), transparent 60%)`,
                      }}
                    />

                    {/* glow on hover */}
                    <div
                      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                      style={{
                        boxShadow: `inset 0 0 0 2px rgba(${m.colorRGB},0.5)`,
                        borderRadius: '14px',
                      }}
                    />

                    <div className="relative">
                      <div className="mb-4 flex items-center gap-2">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full border-2 border-black px-3 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-widest"
                          style={{
                            background: `linear-gradient(135deg, ${m.color}, ${m.color}dd)`,
                          }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-black" />
                          {m.badge}
                        </span>
                      </div>
                      <h3 className="mb-3 font-cabinet text-2xl font-extrabold leading-tight">
                        {m.title}
                      </h3>
                      <p className="text-[15px] font-medium leading-relaxed text-black/70">
                        {m.desc}
                      </p>
                    </div>
                  </div>

                  {/* Bolha WhatsApp com header realista */}
                  <WhatsAppBubble msg={m.chat} color={m.color} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resumo final modernizado */}
        <div className="relative mt-20 overflow-hidden rounded-3xl border-2 border-black bg-gradient-to-br from-[#0a0f0c] via-[#171e19] to-[#0d130f] p-8 text-white lg:p-12">
          {/* glow decorativo */}
          <div
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{
              background:
                'radial-gradient(ellipse at 100% 0%, rgba(144,255,107,0.15), transparent 50%), radial-gradient(ellipse at 0% 100%, rgba(167,139,250,0.15), transparent 50%)',
            }}
          />
          <div className="relative grid items-center gap-8 lg:grid-cols-2">
            <div>
              <h3 className="text-balance font-cabinet text-3xl font-extrabold lg:text-4xl">
                <span className="shimmer-text">6 momentos</span> no dia. <br />
                Você lembra de{' '}
                <span
                  className="text-transparent"
                  style={{ WebkitTextStroke: '2px #fde047' }}
                >
                  zero
                </span>{' '}
                deles.
              </h3>
              <p className="mt-4 text-base font-medium text-[#b7c6c2]">
                Os 2 primeiros (08h e 09h) chegam sozinhos no seu zap. Os outros 4 são você mandando mensagem normal igual já faz com qualquer um.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { value: '2', label: 'Automáticos', color: '#90ff6b', rgb: '144,255,107' },
                { value: '4', label: 'Sob demanda', color: '#fde047', rgb: '253,224,71' },
                { value: '~2min', label: 'No dia todo', color: '#a78bfa', rgb: '167,139,250' },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="relative overflow-hidden rounded-xl border-2 p-4 text-center backdrop-blur-sm"
                  style={{
                    borderColor: stat.color,
                    background: `linear-gradient(135deg, rgba(${stat.rgb},0.18), rgba(${stat.rgb},0.05))`,
                    boxShadow: `0 0 20px rgba(${stat.rgb},0.2)`,
                  }}
                >
                  <p
                    className="font-cabinet text-3xl font-extrabold"
                    style={{ color: stat.color }}
                  >
                    {stat.value}
                  </p>
                  <p
                    className="text-xs font-bold uppercase"
                    style={{ color: stat.color }}
                  >
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhatsAppBubble({
  msg,
  color,
}: {
  msg: { from: 'bot' | 'user'; text: string; reply?: string };
  color: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border-2 border-black"
      style={{ boxShadow: '4px 4px 0 0 #000' }}
    >
      {/* glow externo */}
      <div
        className="pointer-events-none absolute -inset-1 rounded-2xl opacity-20 blur-xl"
        style={{ backgroundColor: color }}
      />

      {/* header WhatsApp */}
      <div className="relative flex items-center gap-2.5 bg-[#008069] px-3 py-2 text-white">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#90ff6b] text-xs font-bold text-black">
          MC
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight">
            MeuCaixa
          </p>
          <p className="flex items-center gap-1 text-[10px] leading-tight text-white/80">
            <span className="h-1.5 w-1.5 rounded-full bg-[#90ff6b]" />
            online
          </p>
        </div>
        <CheckCheck className="h-4 w-4 text-[#90ff6b]" strokeWidth={2.5} />
      </div>

      {/* corpo do chat */}
      <div
        className="relative p-3"
        style={{
          background: '#efeae2',
          backgroundImage:
            'radial-gradient(circle at 30% 30%, rgba(15,20,25,0.04) 0px, transparent 25px), radial-gradient(circle at 70% 80%, rgba(15,20,25,0.04) 0px, transparent 30px)',
          backgroundSize: '90px 90px',
        }}
      >
        {msg.from === 'bot' ? (
          <div className="flex justify-start">
            <div className="relative max-w-[90%] rounded-lg bg-white p-2.5 pr-12 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
              <pre className="whitespace-pre-wrap font-sans text-[13px] leading-snug text-[#111b21]">
                {msg.text}
              </pre>
              <span className="absolute bottom-1 right-2 text-[10px] text-[#667781]">
                agora
              </span>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-1.5 flex justify-end">
              <div className="relative max-w-[90%] rounded-lg bg-[#d9fdd3] p-2.5 pr-12 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
                <pre className="whitespace-pre-wrap font-sans text-[13px] leading-snug text-[#111b21]">
                  {msg.text}
                </pre>
                <span className="absolute bottom-1 right-2 flex items-center gap-0.5 text-[10px] text-[#667781]">
                  agora
                  <CheckCheck className="h-3 w-3 text-[#53bdeb]" strokeWidth={2.5} />
                </span>
              </div>
            </div>
            {msg.reply && (
              <div className="flex justify-start">
                <div className="relative max-w-[90%] rounded-lg bg-white p-2.5 pr-12 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
                  <pre className="whitespace-pre-wrap font-sans text-[13px] leading-snug text-[#111b21]">
                    {msg.reply}
                  </pre>
                  <span className="absolute bottom-1 right-2 text-[10px] text-[#667781]">
                    agora
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
