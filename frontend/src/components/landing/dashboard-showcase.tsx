import { TrendingUp, TrendingDown, AlertCircle, ArrowUpRight, Wallet, Clock } from 'lucide-react';

function CashflowSparkline() {
  const points = [
    { x: 0, y: 70 },
    { x: 10, y: 60 },
    { x: 20, y: 65 },
    { x: 30, y: 50 },
    { x: 40, y: 55 },
    { x: 50, y: 40 },
    { x: 60, y: 45 },
    { x: 70, y: 35 },
    { x: 80, y: 38 },
    { x: 90, y: 25 },
    { x: 100, y: 30 },
  ];
  const path = `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')}`;
  const area = `${path} L 100,100 L 0,100 Z`;

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
      <defs>
        <linearGradient id="cashflowGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#90ff6b" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#90ff6b" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#cashflowGrad)" />
      <path d={path} stroke="#000000" strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2" fill="#000000" />
      ))}
    </svg>
  );
}

function CategoryDonut() {
  const segments = [
    { color: '#90ff6b', percent: 35, label: 'Alimentação' },
    { color: '#171e19', percent: 28, label: 'Moradia' },
    { color: '#b7c6c2', percent: 18, label: 'Transporte' },
    { color: '#ff5f57', percent: 12, label: 'Lazer' },
    { color: '#e0e0e0', percent: 7, label: 'Outros' },
  ];
  let cumulative = 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative h-full w-full">
      <svg viewBox="0 0 100 100" className="-rotate-90 h-full w-full">
        {segments.map((s, i) => {
          const dashArray = `${(s.percent / 100) * circumference} ${circumference}`;
          const offset = -(cumulative / 100) * circumference;
          cumulative += s.percent;
          return (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth="14"
              strokeDasharray={dashArray}
              strokeDashoffset={offset}
            />
          );
        })}
        <circle cx="50" cy="50" r={radius - 8} fill="white" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-cabinet text-2xl font-extrabold">R$ 34,6k</p>
        <p className="text-[10px] font-bold uppercase text-black/60">Despesas</p>
      </div>
    </div>
  );
}

export function DashboardShowcase() {
  return (
    <section className="relative overflow-hidden border-b-2 border-black bg-white py-24">
      <div className="absolute inset-0 dot-pattern opacity-[0.05]" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <span className="inline-block rounded-full border-2 border-black bg-[#b7c6c2] px-4 py-1 font-cabinet text-sm font-extrabold">
            DASHBOARD
          </span>
          <h2 className="mx-auto mt-6 max-w-3xl text-balance font-cabinet text-5xl font-extrabold tracking-tighter sm:text-6xl">
            Sua vida financeira em{' '}
            <span className="text-stroke">números</span>, atualizada agora.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-medium text-black/70">
            6 KPIs, 4 gráficos e projeção de saldo pra 60 dias. Tudo bate em tempo real com o que você lança no WhatsApp.
          </p>
        </div>

        <div className="relative">
          <div className="absolute -left-6 -top-4 rotate-[-8deg] z-10 hidden sm:block">
            <div
              className="rounded-xl border-[3px] border-black bg-[#90ff6b] px-4 py-2 font-cabinet text-xs font-extrabold uppercase"
              style={{ boxShadow: '3px 3px 0px 0px #000000' }}
            >
              ✓ Atualiza em tempo real
            </div>
          </div>

          <div
            className="overflow-hidden rounded-3xl border-2 border-black bg-white"
            style={{ boxShadow: '12px 12px 0px 0px #000000' }}
          >
            <div className="flex items-center justify-between border-b-2 border-black bg-[#171e19] px-6 py-3 text-white">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                  <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
                  <div className="h-3 w-3 rounded-full bg-[#28c840]" />
                </div>
                <div className="ml-3 rounded-md border border-white/20 bg-[#0d130f] px-3 py-0.5 font-mono text-[11px] text-white/80">
                  app.meucaixa.store/dashboard
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-bold text-[#b7c6c2]">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#90ff6b]" />
                  online
                </span>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-cabinet text-3xl font-extrabold">
                    Bom dia, Marina 👋
                  </h3>
                  <p className="text-sm font-medium text-black/60">
                    Aqui está o resumo de Outubro
                  </p>
                </div>
                <div className="flex gap-2 text-xs font-bold">
                  <button className="rounded-lg border-2 border-black bg-black px-3 py-2 text-white">
                    Este mês
                  </button>
                  <button className="rounded-lg border-2 border-black/20 bg-white px-3 py-2">
                    Mês passado
                  </button>
                  <button className="rounded-lg border-2 border-black/20 bg-white px-3 py-2 hidden sm:block">
                    Ano
                  </button>
                </div>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                {[
                  { label: 'Receitas', value: 'R$ 82,4k', icon: TrendingUp, delta: '+12%', color: 'bg-[#90ff6b]' },
                  { label: 'Despesas', value: 'R$ 34,6k', icon: TrendingDown, delta: '-4%', color: 'bg-[#171e19] text-white' },
                  { label: 'Saldo', value: 'R$ 47,8k', icon: Wallet, delta: '+18%', color: 'bg-[#b7c6c2]' },
                  { label: 'A Receber', value: 'R$ 12,3k', icon: ArrowUpRight, delta: '5 títulos', color: 'bg-white' },
                  { label: 'A Pagar', value: 'R$ 8,9k', icon: Clock, delta: '7 títulos', color: 'bg-white' },
                  { label: 'Vencidas', value: '2', icon: AlertCircle, delta: 'R$ 1,2k', color: 'bg-[#ffe5e5]' },
                ].map((kpi, i) => (
                  <div
                    key={i}
                    className={`rounded-xl border-2 border-black p-3 ${kpi.color}`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <kpi.icon className="h-4 w-4" strokeWidth={2.5} />
                      <span className="font-mono text-[10px] font-bold opacity-70">{kpi.delta}</span>
                    </div>
                    <p className="text-[10px] font-bold uppercase opacity-70">{kpi.label}</p>
                    <p className="font-cabinet text-lg font-extrabold leading-tight">{kpi.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl border-2 border-black bg-white p-5 lg:col-span-2">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h4 className="font-cabinet text-lg font-extrabold">
                        Receitas vs Despesas
                      </h4>
                      <p className="text-xs font-medium text-black/60">Últimos 7 dias</p>
                    </div>
                    <div className="flex gap-3 text-[11px] font-bold">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#90ff6b]" />
                        Receitas
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#171e19]" />
                        Despesas
                      </span>
                    </div>
                  </div>
                  <div className="flex h-32 items-end gap-2">
                    {[
                      [40, 25], [65, 30], [50, 40], [80, 35], [45, 50], [90, 28], [70, 45],
                    ].map(([r, d], i) => (
                      <div key={i} className="flex flex-1 items-end gap-0.5">
                        <div
                          className="flex-1 rounded-t border-2 border-black bg-[#90ff6b]"
                          style={{ height: `${r}%` }}
                        />
                        <div
                          className="flex-1 rounded-t border-2 border-black bg-[#171e19]"
                          style={{ height: `${d}%` }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border-2 border-black bg-white p-5">
                  <h4 className="mb-2 font-cabinet text-lg font-extrabold">
                    Despesas por categoria
                  </h4>
                  <div className="h-32">
                    <CategoryDonut />
                  </div>
                </div>

                <div className="rounded-xl border-2 border-black bg-[#171e19] p-5 text-white lg:col-span-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="font-cabinet text-lg font-extrabold">
                        Projeção de fluxo de caixa
                      </h4>
                      <p className="text-xs font-medium text-[#b7c6c2]">
                        Próximos 60 dias baseado em pendências confirmadas
                      </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-[#90ff6b]/30 bg-[#90ff6b]/10 px-3 py-1.5 text-xs font-bold text-[#90ff6b]">
                      <AlertCircle className="h-3.5 w-3.5" strokeWidth={3} />
                      Atenção: saldo crítico em 12 dias
                    </div>
                  </div>
                  <div className="h-24 rounded-lg border border-[#272727] bg-[#0d130f] p-2">
                    <CashflowSparkline />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-4 -right-4 rotate-[6deg] z-10 hidden sm:block">
            <div
              className="rounded-xl border-[3px] border-black bg-black px-4 py-2 font-cabinet text-xs font-extrabold uppercase text-[#90ff6b]"
              style={{ boxShadow: '3px 3px 0px 0px #90ff6b' }}
            >
              ⚡ Bate com o zap
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            { value: '6', label: 'KPIs em tempo real' },
            { value: '60 dias', label: 'Projeção de caixa' },
            { value: '∞', label: 'Filtros e períodos' },
          ].map((stat, i) => (
            <div
              key={i}
              className="rounded-2xl border-2 border-black bg-[#b7c6c2] p-6 text-center"
            >
              <p className="font-cabinet text-4xl font-extrabold">{stat.value}</p>
              <p className="text-sm font-bold uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
