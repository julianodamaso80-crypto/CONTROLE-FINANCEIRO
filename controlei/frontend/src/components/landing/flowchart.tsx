import {
  UserPlus,
  Phone,
  MessageCircle,
  Brain,
  Check,
  Zap,
} from 'lucide-react';

type Step = {
  n: string;
  icon: typeof UserPlus;
  color: string;
  colorRGB: string;
  title: string;
  desc: string;
  detail: string;
};

const steps: Step[] = [
  {
    n: '01',
    icon: UserPlus,
    color: '#b7c6c2',
    colorRGB: '183, 198, 194',
    title: 'Cria sua conta',
    desc: 'Email, senha e seu WhatsApp. 30 segundos.',
    detail: 'É só pra ganhar acesso. Sem cartão. 3 dias grátis pra testar.',
  },
  {
    n: '02',
    icon: Phone,
    color: '#fde047',
    colorRGB: '253, 224, 71',
    title: 'Salva o nosso número',
    desc: 'Bot oficial: (21) 98312-8245',
    detail: 'A gente já manda o primeiro "oi" pra confirmar que tá tudo certo.',
  },
  {
    n: '03',
    icon: MessageCircle,
    color: '#90ff6b',
    colorRGB: '144, 255, 107',
    title: 'Manda mensagem normal',
    desc: 'Texto, áudio, foto da nota ou PDF do boleto.',
    detail: 'Igual você manda pra qualquer pessoa. Sem comando, sem app extra.',
  },
  {
    n: '04',
    icon: Brain,
    color: '#fb923c',
    colorRGB: '251, 146, 60',
    title: 'O bot entende e registra',
    desc: 'Categoriza, salva e devolve confirmação em 3 segundos.',
    detail: 'Entende português informal, "k" pra mil, gírias. Sem precisar formatar.',
  },
  {
    n: '05',
    icon: Check,
    color: '#a78bfa',
    colorRGB: '167, 139, 250',
    title: 'Você vê tudo pronto',
    desc: 'No chat ou no dashboard web em tempo real.',
    detail: 'Saldo bate sozinho. Relatório do mês sai em PDF quando você pedir.',
  },
];

export function Flowchart() {
  return (
    <section
      id="como-funciona"
      className="relative overflow-hidden border-b-2 border-black bg-gradient-to-b from-white via-[#fafafa] to-white py-24"
    >
      {/* grid background sutil */}
      <div className="absolute inset-0 opacity-[0.04]">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              'radial-gradient(circle, #000 1.2px, transparent 1.2px)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* gradient ambiente */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            'radial-gradient(ellipse at 10% 50%, rgba(253,224,71,0.05), transparent 30%), radial-gradient(ellipse at 90% 50%, rgba(167,139,250,0.05), transparent 30%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-[#fde047] px-4 py-1.5 font-mono text-xs font-extrabold shadow-[3px_3px_0_0_#000]">
            <Zap className="h-3.5 w-3.5 animate-glow-pulse" strokeWidth={3} />
            COMO FUNCIONA
          </div>
          <h2 className="mx-auto mt-6 max-w-3xl text-balance font-cabinet text-5xl font-extrabold tracking-tighter sm:text-6xl">
            5 passos do{' '}
            <span className="text-stroke">cadastro</span> ao primeiro
            lançamento.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-medium text-black/70">
            Tempo médio:{' '}
            <span className="rounded bg-black px-2 py-0.5 font-mono text-sm font-extrabold text-[#90ff6b]">
              2min 18s
            </span>
            . Sem instalar app, sem treinamento.
          </p>
        </div>

        {/* Fluxograma horizontal — desktop */}
        <div className="hidden lg:block">
          <div className="relative">
            {/* linha conectora animada com gradient */}
            <svg
              className="absolute left-0 right-0 top-[56px] z-0 h-4 w-full"
              viewBox="0 0 1000 16"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="flow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#b7c6c2" />
                  <stop offset="25%" stopColor="#fde047" />
                  <stop offset="50%" stopColor="#90ff6b" />
                  <stop offset="75%" stopColor="#fb923c" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
              <line
                x1="100"
                y1="8"
                x2="900"
                y2="8"
                stroke="url(#flow-grad)"
                strokeWidth="3"
                strokeDasharray="8 6"
                className="animate-dash-flow"
              />
            </svg>

            <div className="relative z-10 grid grid-cols-5 items-stretch gap-3">
              {steps.map((s, i) => (
                <div key={i} className="group flex flex-col items-center">
                  {/* Bolinha com glow + número */}
                  <div className="relative mb-5">
                    {/* glow externo */}
                    <div
                      className="absolute -inset-2 rounded-3xl opacity-40 blur-xl transition-opacity duration-500 group-hover:opacity-70"
                      style={{ backgroundColor: s.color }}
                    />

                    <div
                      className="relative flex h-28 w-28 items-center justify-center rounded-2xl border-[3px] border-black transition-transform duration-500 group-hover:scale-105"
                      style={{
                        background: `linear-gradient(135deg, ${s.color}, ${s.color}cc)`,
                        boxShadow: `0 0 30px rgba(${s.colorRGB},0.35), 4px 4px 0 0 #000`,
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
                      <s.icon className="relative h-10 w-10 text-black" strokeWidth={2.5} />

                      {/* badge número com glow */}
                      <span
                        className="absolute -right-3 -top-3 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-black bg-black font-cabinet text-xs font-extrabold"
                        style={{
                          color: s.color,
                          boxShadow: `0 0 16px rgba(${s.colorRGB},0.6)`,
                        }}
                      >
                        {s.n}
                      </span>

                      {/* status dot piscando */}
                      <span className="absolute -left-1 -bottom-1 flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-black opacity-40" />
                        <span
                          className="relative inline-flex h-3 w-3 rounded-full border-2 border-black"
                          style={{ backgroundColor: s.color }}
                        />
                      </span>
                    </div>
                  </div>

                  {/* Card com altura igualada + gradient sutil + hover */}
                  <div
                    className="card-lift relative flex w-full flex-1 flex-col overflow-hidden rounded-2xl border-2 border-black bg-white p-5 text-center"
                    style={{ boxShadow: '4px 4px 0 0 #000', minHeight: '260px' }}
                  >
                    {/* gradient sutil no fundo */}
                    <div
                      className="pointer-events-none absolute inset-0 opacity-50"
                      style={{
                        background: `radial-gradient(ellipse at top, rgba(${s.colorRGB},0.08), transparent 60%)`,
                      }}
                    />

                    {/* border glow on hover */}
                    <div
                      className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                      style={{
                        boxShadow: `inset 0 0 0 2px rgba(${s.colorRGB},0.5)`,
                      }}
                    />

                    <div className="relative flex flex-1 flex-col">
                      <h3 className="mb-2 font-cabinet text-lg font-extrabold leading-tight">
                        {s.title}
                      </h3>
                      <p className="mb-3 text-sm font-medium text-black/80">
                        {s.desc}
                      </p>
                      <p className="mt-auto border-t-2 border-dashed border-black/15 pt-3 text-xs font-medium italic text-black/55">
                        {s.detail}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fluxograma vertical — mobile/tablet */}
        <div className="space-y-6 lg:hidden">
          {steps.map((s, i) => (
            <div key={i} className="relative">
              {i < steps.length - 1 && (
                <div
                  className="absolute bottom-[-24px] left-14 z-0 h-6 w-1 rounded-full"
                  style={{ background: `linear-gradient(${s.color}, transparent)` }}
                />
              )}

              <div className="flex items-stretch gap-4">
                <div className="relative">
                  <div
                    className="absolute -inset-2 rounded-3xl opacity-30 blur-xl"
                    style={{ backgroundColor: s.color }}
                  />
                  <div
                    className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-[3px] border-black"
                    style={{
                      background: `linear-gradient(135deg, ${s.color}, ${s.color}cc)`,
                      boxShadow: `0 0 24px rgba(${s.colorRGB},0.4), 4px 4px 0 0 #000`,
                    }}
                  >
                    <s.icon className="h-9 w-9 text-black" strokeWidth={2.5} />
                    <span
                      className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-black bg-black font-cabinet text-xs font-extrabold"
                      style={{ color: s.color }}
                    >
                      {s.n}
                    </span>
                  </div>
                </div>

                <div
                  className="relative flex flex-1 flex-col overflow-hidden rounded-2xl border-2 border-black bg-white p-5"
                  style={{ boxShadow: '4px 4px 0 0 #000' }}
                >
                  <div
                    className="pointer-events-none absolute inset-0 opacity-50"
                    style={{
                      background: `radial-gradient(ellipse at top, rgba(${s.colorRGB},0.08), transparent 60%)`,
                    }}
                  />
                  <div className="relative">
                    <h3 className="mb-2 font-cabinet text-xl font-extrabold leading-tight">
                      {s.title}
                    </h3>
                    <p className="mb-3 text-sm font-medium text-black/80">
                      {s.desc}
                    </p>
                    <p className="border-t-2 border-dashed border-black/15 pt-3 text-xs font-medium italic text-black/55">
                      {s.detail}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA com glow */}
        <div className="mt-16 text-center">
          <div className="relative inline-block">
            <div
              className="absolute -inset-2 rounded-2xl opacity-50 blur-xl animate-glow-pulse"
              style={{ background: '#90ff6b' }}
            />
            <a
              href="/register"
              className="brutal-btn relative inline-flex items-center gap-2 rounded-xl border-2 border-black bg-[#90ff6b] px-7 py-4 font-cabinet text-lg font-extrabold"
              style={{ boxShadow: '4px 4px 0 0 #000' }}
            >
              Começar agora (3 dias grátis)
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14m-7-7l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
