import { UserPlus, MessageCircle, Bot, BarChart3, FileText } from 'lucide-react';

const steps = [
  {
    n: '01',
    icon: UserPlus,
    title: 'Crie sua conta em 30 segundos',
    description:
      'Email, senha e seu número de WhatsApp. Pronto. Você ganha 3 dias grátis pra testar tudo sem cartão.',
    detail:
      'O número que você cadastra é o que o nosso bot vai reconhecer quando você mandar mensagem. Sistema já cria categorias padrão (Alimentação, Moradia, Transporte, Lazer, etc.).',
    color: '#b7c6c2',
  },
  {
    n: '02',
    icon: MessageCircle,
    title: 'Salve o número da Controlei no seu zap',
    description:
      'Você recebe boas-vindas no nosso número oficial (21 98312-8245) na hora que cadastra. Salve nos contatos e pronto.',
    detail:
      'Não tem QR code, não tem app pra instalar, não tem pareamento. É só conversar com o nosso bot pelo WhatsApp que você já usa todo dia.',
    color: '#90ff6b',
  },
  {
    n: '03',
    icon: Bot,
    title: 'Lance transação por texto, áudio, foto ou PDF',
    description:
      'Manda "gastei 50 no uber", grava áudio, tira foto do cupom ou encaminha PDF do boleto. A IA processa tudo.',
    detail:
      'GPT-4o-mini Vision lê fotos, Gemini transcreve áudios, pdf-parse extrai boletos. Funciona com português informal, gírias e abreviações tipo "1.5k".',
    color: '#ffffff',
  },
  {
    n: '04',
    icon: BarChart3,
    title: 'Acompanha pelo dashboard web',
    description:
      'Acessa app.controlei.ia.br, vê 6 KPIs em tempo real, gráficos por categoria e projeção de caixa pra 60 dias.',
    detail:
      'Filtra por período, categoria ou conta. Importa extrato OFX direto do banco, exporta CSV pra abrir no Excel. Configura orçamentos, metas e cartão de crédito até 48x.',
    color: '#fde047',
  },
  {
    n: '05',
    icon: FileText,
    title: 'Pede relatório PDF no fim do mês',
    description:
      'Manda "relatório do mês em PDF" no nosso zap. O bot pergunta o período, gera o documento e envia direto no chat.',
    detail:
      'PDF formatado com receitas, despesas, saldo, top categorias e listagem completa. Quota de 4 PDFs por mês. Útil pra guardar, mandar pro contador ou usar na declaração de IR.',
    color: '#fb923c',
  },
];

export function ExtendedHowItWorks() {
  return (
    <section
      id="how"
      className="relative border-b-2 border-black bg-[#171e19] py-24 text-white"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-20 text-center">
          <span className="inline-block rounded-full border-2 border-[#b7c6c2] bg-[#171e19] px-4 py-1 font-cabinet text-sm font-extrabold text-[#b7c6c2]">
            COMO FUNCIONA
          </span>
          <h2 className="mx-auto mt-6 max-w-3xl text-balance font-cabinet text-5xl font-extrabold tracking-tighter sm:text-6xl">
            Cinco passos. Pronto pra{' '}
            <span
              className="text-transparent"
              style={{ WebkitTextStroke: '2px #90ff6b' }}
            >
              produzir
            </span>{' '}
            em 5 minutos.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-medium text-[#b7c6c2]">
            Sem QR code, sem app pra instalar, sem treinamento. Você cadastra o seu WhatsApp, salva o número da Controlei e já começa a usar.
          </p>
        </div>

        <div className="space-y-4">
          {steps.map((s, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-2xl border-2 border-[#272727] bg-[#0d130f] p-6 transition-all hover:border-[#90ff6b]/40 lg:p-8"
            >
              <div className="grid items-center gap-6 lg:grid-cols-12">
                <div className="flex items-center gap-4 lg:col-span-3">
                  <div
                    className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-[3px] font-cabinet text-3xl font-extrabold"
                    style={{
                      borderColor: s.color,
                      color: s.color,
                      backgroundColor: 'rgba(0,0,0,0.3)',
                    }}
                  >
                    {s.n}
                  </div>
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-[#272727] bg-[#171e19]"
                  >
                    <s.icon className="h-6 w-6" style={{ color: s.color }} strokeWidth={2.5} />
                  </div>
                </div>

                <div className="lg:col-span-9">
                  <h3 className="mb-2 font-cabinet text-2xl font-extrabold lg:text-3xl">
                    {s.title}
                  </h3>
                  <p className="mb-3 text-base font-medium text-white/90">
                    {s.description}
                  </p>
                  <p className="rounded-lg border border-[#272727] bg-[#171e19] px-4 py-3 text-sm font-medium text-[#b7c6c2]">
                    <span className="mr-2 font-mono text-xs font-bold uppercase text-[#90ff6b]">
                      Como funciona →
                    </span>
                    {s.detail}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="mb-6 font-mono text-sm text-[#b7c6c2]">
            Tempo médio entre cadastro e primeiro lançamento: <span className="font-bold text-[#90ff6b]">2 minutos e 18 segundos</span>
          </p>
          <a
            href="/register"
            className="brutal-btn inline-flex items-center gap-3 rounded-xl border-2 border-[#90ff6b] bg-[#90ff6b] px-8 py-5 font-cabinet text-lg font-extrabold text-black"
            style={{ boxShadow: '4px 4px 0px 0px #90ff6b' }}
          >
            Começar grátis agora
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14m-7-7l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
