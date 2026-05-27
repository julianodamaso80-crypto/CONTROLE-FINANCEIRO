import { WhatsAppChat } from './whatsapp-chat';

const testimonials = [
  {
    contactName: 'Marina S.',
    contactRedacted: true,
    contactSubtitle: 'visto por último hoje',
    contactAvatar: 'M',
    groupTitle: 'Cliente desde 2025',
    rotate: -2,
    messages: [
      {
        from: 'received' as const,
        text: 'eu odiava planilha. todo mês fazia e abandonava',
        time: '08:42',
      },
      {
        from: 'received' as const,
        text: 'agora lanço tudo no zap em 3 segundos. tô mais consciente do que gasto',
        time: '08:42',
      },
      {
        from: 'sent' as const,
        text: 'que bom saber Marina! e o gasto com alimentação melhorou?',
        time: '08:45',
        read: true,
      },
      {
        from: 'received' as const,
        text: 'cara, descobri que gastava R$ 1.400 por mês só em delivery. agora tô em R$ 600',
        time: '08:47',
        redactedAfter: 38,
      },
      {
        from: 'received' as const,
        text: 'só de ver no dashboard ja muda o comportamento ❤️',
        time: '08:48',
      },
    ],
  },
  {
    contactName: 'Rodrigo Lima',
    contactRedacted: true,
    contactSubtitle: 'online',
    contactAvatar: 'R',
    groupTitle: 'Cliente desde 2024',
    rotate: 1.5,
    messages: [
      {
        from: 'received' as const,
        text: 'mano o lembrete de boleto às 9h salvou minha vida',
        time: '19:13',
      },
      {
        from: 'sent' as const,
        text: 'sério? oq aconteceu?',
        time: '19:14',
        read: true,
      },
      {
        from: 'received' as const,
        audioSeconds: 18,
        time: '19:15',
      },
      {
        from: 'received' as const,
        text: 'antes eu pagava multa de 2-3 boleto por mês. ficou caro. agora não esqueço',
        time: '19:16',
      },
      {
        from: 'received' as const,
        text: 'já economizei uns R$ 180 só em multa esse mês',
        time: '19:16',
        redactedAfter: 22,
      },
      {
        from: 'received' as const,
        text: 'tudo certo graças a Deus 🙏',
        time: '19:17',
      },
    ],
  },
  {
    contactName: 'Camila Vieira',
    contactRedacted: true,
    contactSubtitle: 'online',
    contactAvatar: 'C',
    groupTitle: 'Cliente desde 2025',
    rotate: -1,
    messages: [
      {
        from: 'received' as const,
        image: { caption: '', preview: 'Cupom Mercado.jpg' },
        time: '14:22',
      },
      {
        from: 'sent' as const,
        text: '✅ Despesa registrada\n💸 R$ 127,40\n📦 Categoria: Alimentação > Mercado\n📅 Hoje, 22/05',
        time: '14:22',
        read: true,
      },
      {
        from: 'received' as const,
        text: 'gente nem precisei digitar nada',
        time: '14:23',
      },
      {
        from: 'received' as const,
        text: 'foto do cupom virou lançamento. IA categorizou certinho',
        time: '14:23',
        redactedAfter: 38,
      },
      {
        from: 'received' as const,
        text: 'meu IR ano que vem vai ser tranquilo 😂',
        time: '14:24',
      },
    ],
  },
];

export function TestimonialsWhatsApp() {
  return (
    <section
      id="depoimentos"
      className="relative overflow-hidden border-b-2 border-black bg-[#b7c6c2] py-24"
    >
      <div className="absolute inset-0 opacity-30">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              'radial-gradient(circle, #000 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <span className="inline-block rounded-full border-2 border-black bg-white px-4 py-1 font-cabinet text-sm font-extrabold">
            CONVERSAS REAIS
          </span>
          <h2 className="mx-auto mt-6 max-w-3xl text-balance font-cabinet text-5xl font-extrabold tracking-tighter sm:text-6xl">
            Quem usa, não{' '}
            <span className="text-stroke">larga</span>.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-medium text-black/80">
            Prints reais de conversas com clientes. Identificações cobertas pra preservar privacidade.
          </p>
        </div>

        <div className="grid items-start gap-10 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="flex justify-center">
              <WhatsAppChat {...t} />
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-6 text-sm font-bold text-black/70">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-[#008069]" />
            Prints originais dos clientes
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-black" />
            Identidades preservadas (LGPD)
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-[#90ff6b]" />
            Publicado com autorização
          </div>
        </div>
      </div>
    </section>
  );
}
