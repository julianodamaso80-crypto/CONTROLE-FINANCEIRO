import {
  Mic,
  Image as ImageIcon,
  FileText,
  Type,
  BarChart3,
  PieChart,
  CreditCard,
  Target,
  Users,
  FileDown,
  Sparkles,
  Wallet,
} from 'lucide-react';

const features = [
  {
    icon: Type,
    title: 'Texto livre no WhatsApp',
    text: 'Manda "almoço cliente 87 reais" pro nosso bot. A IA entende português informal, gírias, "k" pra mil, e categoriza automático.',
    highlight: 'IA Generativa',
  },
  {
    icon: Mic,
    title: 'Áudio pelo WhatsApp',
    text: 'Sem tempo pra digitar? Grava áudio no zap. O Gemini transcreve em português, IA classifica e o bot devolve confirmação em texto.',
    highlight: 'Gemini Speech',
  },
  {
    icon: ImageIcon,
    title: 'Foto da nota fiscal',
    text: 'Tira foto do comprovante ou cupom fiscal e manda pro bot. O GPT-4o-mini Vision lê valor, descrição e data automaticamente.',
    highlight: 'OCR com IA',
  },
  {
    icon: FileText,
    title: 'PDF de boleto',
    text: 'Encaminha boleto, nota fiscal eletrônica ou extrato em PDF pro nosso zap. O sistema extrai os dados e gera o lançamento.',
    highlight: 'PDF Parser',
  },
  {
    icon: BarChart3,
    title: 'Relatório mensal em PDF',
    text: 'Manda "relatório do mês em PDF" pro bot. Em segundos recebe documento formatado pra guardar ou compartilhar.',
    highlight: '4 PDFs/mês',
  },
  {
    icon: PieChart,
    title: 'Dashboard web em tempo real',
    text: '6 KPIs, gráfico receita vs despesa por dia, pizza por categoria, comparativo de 6 meses e projeção de caixa pra 60 dias.',
    highlight: 'Tempo real',
  },
  {
    icon: CreditCard,
    title: 'Cartão de crédito até 48x',
    text: 'Cadastra cartões (Nubank, Itaú, Inter, AMEX, etc.). Lança despesa em até 48 parcelas e o sistema distribui nas faturas futuras.',
    highlight: 'Até 48x',
  },
  {
    icon: Target,
    title: 'Orçamento com alerta no zap',
    text: 'Define limite por categoria. Se passar do percentual de alerta (padrão 80%), o bot avisa pelo WhatsApp na hora.',
    highlight: 'Auto 24/7',
  },
  {
    icon: FileDown,
    title: 'Importa extrato OFX',
    text: 'Sobe arquivo OFX no painel (BB, Itaú, Nubank, Inter, Bradesco, Santander, Caixa). Sistema detecta duplicatas e categoriza padrão.',
    highlight: 'OFX + CSV',
  },
  {
    icon: Users,
    title: 'Compartilhe com quem precisa',
    text: 'Pode incluir cônjuge, sócio ou alguém da família. Cada pessoa cadastra o WhatsApp próprio e o bot reconhece quem lançou cada gasto.',
    highlight: 'Multi-usuário',
  },
  {
    icon: Wallet,
    title: 'Metas com aporte progressivo',
    text: 'Define meta tipo "guardar R$ 10 mil até dezembro". Vai adicionando aportes e acompanha barra de progresso e dias restantes.',
    highlight: 'Tracking',
  },
  {
    icon: Sparkles,
    title: 'Categorias do seu jeito',
    text: 'Cria categorias em até 3 níveis (ex: Alimentação > Mercado > Hortifruti). A IA aprende a sua estrutura e categoriza certo.',
    highlight: '3 níveis',
  },
];

export function ExtendedFeatureGrid() {
  return (
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
            12 funções pra controlar.{' '}
            <span className="text-stroke">Zero</span> planilha pra abrir.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-medium text-black/80">
            Você cadastra a sua conta, salva o número da Controlei no zap e ganha um assistente financeiro completo.
            De OCR de cupom fiscal até projeção de saldo pra 60 dias.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={i}
              className="feature-card brutal-shadow-sm group relative overflow-hidden rounded-2xl border-2 border-black bg-white p-7 transition-all hover:-translate-y-1 hover:brutal-shadow"
            >
              <div className="absolute right-4 top-4 rounded-full border border-black/20 bg-black/5 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-black/70">
                {f.highlight}
              </div>
              <div className="feature-icon-box mb-6 flex h-14 w-14 items-center justify-center rounded-xl border-2 border-black">
                <f.icon className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <h3 className="mb-3 font-cabinet text-xl font-extrabold leading-tight">
                {f.title}
              </h3>
              <p className="text-[15px] font-medium leading-relaxed text-black/70">
                {f.text}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <a
            href="/recursos"
            className="brutal-btn inline-flex items-center gap-2 rounded-xl border-2 border-black bg-black px-7 py-4 font-cabinet font-extrabold text-white"
            style={{ boxShadow: '4px 4px 0px 0px #000000' }}
          >
            Ver todos os recursos em detalhe
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14m-7-7l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
