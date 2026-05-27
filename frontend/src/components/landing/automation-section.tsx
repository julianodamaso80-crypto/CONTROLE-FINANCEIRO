import { Bell, AlertTriangle, Calendar, Brain, Clock } from 'lucide-react';

const automations = [
  {
    time: '09:00',
    icon: Calendar,
    title: 'Boletos vencendo hoje',
    description:
      'Toda manhã às 9h, o bot manda lista de tudo que vence no dia. Você nunca mais perde um vencimento por esquecimento.',
    example: '🔔 Vence HOJE (3):\n• Aluguel — R$ 1.450\n• Fatura Nubank — R$ 890\n• Energia — R$ 230',
    color: 'bg-[#90ff6b]',
  },
  {
    time: '08:00',
    icon: AlertTriangle,
    title: 'Orçamento estourado',
    description:
      'Às 8h, se algum orçamento ultrapassou 80% ou 100%, você recebe alerta no zap. Decisão antes do estrago.',
    example: '⚠️ Atenção: Alimentação\nVocê já usou 87% do orçamento (R$ 870 de R$ 1.000)\nR$ 130 pra fechar o mês',
    color: 'bg-[#b7c6c2]',
  },
  {
    time: 'tempo real',
    icon: Brain,
    title: 'Categorização automática',
    description:
      'Toda transação é categorizada pela IA na hora. Você não escolhe categoria manualmente, o sistema entende contexto.',
    example: 'Você: "paguei 87 no almoço"\nBot: ✅ Despesa registrada\n📦 Categoria: Alimentação > Restaurante\n💵 R$ 87,00',
    color: 'bg-white',
  },
];

export function AutomationSection() {
  return (
    <section className="relative overflow-hidden border-b-2 border-black bg-[#171e19] py-24 text-white">
      <div className="absolute inset-0 opacity-[0.04]">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              'radial-gradient(circle, #90ff6b 1.5px, transparent 1.5px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-[#90ff6b]/40 bg-[#90ff6b]/10 px-4 py-1.5 font-cabinet text-sm font-extrabold text-[#90ff6b]">
            <Clock className="h-4 w-4" strokeWidth={3} />
            AUTOMAÇÃO 24/7
          </span>
          <h2 className="mx-auto mt-6 max-w-3xl text-balance font-cabinet text-5xl font-extrabold tracking-tighter sm:text-6xl">
            O bot trabalha{' '}
            <span
              className="text-transparent"
              style={{ WebkitTextStroke: '2px #90ff6b' }}
            >
              enquanto
            </span>{' '}
            você dorme.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-medium text-[#b7c6c2]">
            Três rotinas automáticas que rodam sozinhas e te avisam no WhatsApp antes do problema virar prejuízo.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {automations.map((a, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-2xl border-2 border-[#272727] bg-[#0d130f] p-7 transition-all hover:border-[#90ff6b]/60"
            >
              <div className="mb-5 flex items-center justify-between">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-xl border-2 border-black ${a.color}`}
                >
                  <a.icon className="h-6 w-6 text-black" strokeWidth={2.5} />
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-[#272727] bg-[#171e19] px-3 py-1 font-mono text-xs font-bold text-[#90ff6b]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#90ff6b]" />
                  {a.time}
                </div>
              </div>

              <h3 className="mb-3 font-cabinet text-2xl font-extrabold">
                {a.title}
              </h3>
              <p className="mb-6 font-medium text-[#b7c6c2]">{a.description}</p>

              <div className="rounded-xl border border-[#272727] bg-[#171e19] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Bell className="h-3.5 w-3.5 text-[#90ff6b]" strokeWidth={3} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#90ff6b]">
                    Exemplo real
                  </span>
                </div>
                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-white/90">
                  {a.example}
                </pre>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <div className="flex items-center gap-3 rounded-full border-2 border-[#272727] bg-[#0d130f] px-5 py-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#90ff6b] opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#90ff6b]" />
            </span>
            <p className="font-mono text-sm font-bold text-white">
              Sistema rodando agora.{' '}
              <span className="text-[#90ff6b]">3 rotinas ativas</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
