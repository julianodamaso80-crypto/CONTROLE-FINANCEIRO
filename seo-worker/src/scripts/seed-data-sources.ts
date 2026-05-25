import { exec, closePool } from '../db/pg.js';
import { logger } from '../lib/logger.js';

const SOURCES = [
  {
    type: 'estatistica',
    tags: ['inadimplencia', 'dividas', 'controle-de-gastos'],
    title: 'Brasileiros inadimplentes — Serasa 2025',
    fact: 'Em 2025, o Brasil tinha cerca de 73 milhões de adultos inadimplentes, segundo o Mapa da Inadimplência da Serasa Experian — o que representa mais de 40% da população adulta.',
    source_name: 'Serasa Experian',
    source_url: 'https://www.serasaexperian.com.br/conteudos/indicadores-economicos/mapa-da-inadimplencia/',
  },
  {
    type: 'estatistica',
    tags: ['endividamento', 'cartao-de-credito', 'orcamento-familiar'],
    title: 'Endividamento das famílias — Peic CNC',
    fact: 'Segundo a Pesquisa de Endividamento e Inadimplência do Consumidor (Peic) da CNC, mais de 76% das famílias brasileiras estavam endividadas em 2025, com cartão de crédito sendo a principal fonte (84% dos endividados).',
    source_name: 'CNC — Peic',
    source_url: 'https://www.portaldocomercio.org.br/publicacoes/peic',
  },
  {
    type: 'norma',
    tags: ['cadastro-positivo', 'score', 'educacao-financeira'],
    title: 'Cadastro Positivo — Lei 12.414/2011',
    fact: 'A Lei 12.414/2011 instituiu o Cadastro Positivo, que registra o histórico de pagamentos em dia do consumidor — usado por birôs de crédito como Serasa, SPC e Boa Vista pra calcular o score.',
    source_name: 'Planalto — Legislação',
    source_url: 'http://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12414.htm',
  },
  {
    type: 'tabela',
    tags: ['taxa-selic', 'juros', 'orcamento-familiar'],
    title: 'Taxa Selic — Banco Central do Brasil',
    fact: 'A taxa Selic é definida pelo Comitê de Política Monetária (Copom) do BACEN a cada 45 dias e influencia diretamente o custo do crédito, o rendimento da poupança e da renda fixa.',
    source_name: 'BACEN',
    source_url: 'https://www.bcb.gov.br/controleinflacao/taxaselic',
  },
  {
    type: 'estatistica',
    tags: ['renda-media', 'desigualdade', 'orcamento-familiar'],
    title: 'Renda média do trabalhador — IBGE PNAD',
    fact: 'Segundo a PNAD Contínua do IBGE, a renda média mensal do trabalhador brasileiro foi de R$ 3.225 em 2024, com variação relevante por região e nível de escolaridade.',
    source_name: 'IBGE — PNAD Contínua',
    source_url: 'https://www.ibge.gov.br/estatisticas/sociais/trabalho/9173-pesquisa-nacional-por-amostra-de-domicilios-continua-trimestral.html',
  },
  {
    type: 'caso',
    tags: ['planejamento-financeiro', 'metodo-50-30-20', 'orcamento-familiar'],
    title: 'Método 50/30/20 — Elizabeth Warren',
    fact: 'O método 50/30/20, popularizado pela senadora Elizabeth Warren em "All Your Worth", sugere alocar 50% da renda em necessidades, 30% em desejos e 20% em poupança/dívidas — usado como benchmark internacional de educação financeira.',
    source_name: 'Investopedia',
    source_url: 'https://www.investopedia.com/ask/answers/022916/what-503020-budget-rule.asp',
  },
  {
    type: 'estatistica',
    tags: ['whatsapp', 'penetracao', 'whatsapp-financeiro'],
    title: 'Penetração do WhatsApp no Brasil',
    fact: 'Segundo o relatório Digital 2025 da We Are Social/Meltwater, o WhatsApp é usado por mais de 96% dos usuários de internet no Brasil — o maior índice de penetração do mundo.',
    source_name: 'We Are Social — Digital 2025 Brazil',
    source_url: 'https://wearesocial.com/uk/blog/2025/01/digital-2025/',
  },
  {
    type: 'norma',
    tags: ['protecao-consumidor', 'cobranca-indevida', 'educacao-financeira'],
    title: 'Código de Defesa do Consumidor — Cobrança Indevida',
    fact: 'O artigo 42, parágrafo único do Código de Defesa do Consumidor (Lei 8.078/90) garante devolução em dobro de valor cobrado indevidamente — regra reforçada pelo STJ em 2021 (Tema 929).',
    source_name: 'Planalto — CDC',
    source_url: 'http://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm',
  },
  {
    type: 'tabela',
    tags: ['imposto-de-renda', 'declaracao', 'educacao-financeira'],
    title: 'Imposto de Renda — Tabela Receita Federal',
    fact: 'A obrigatoriedade de declarar IR em 2025 começa a partir de R$ 33.888 de rendimentos tributáveis recebidos no ano-calendário, segundo a Receita Federal.',
    source_name: 'Receita Federal',
    source_url: 'https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda',
  },
  {
    type: 'estatistica',
    tags: ['poupanca', 'renda-fixa', 'educacao-financeira'],
    title: 'Brasileiros que poupam — Anbima',
    fact: 'Segundo o Raio X do Investidor da Anbima 2024, apenas 36% dos brasileiros conseguem poupar mensalmente, e a poupança ainda é o produto financeiro mais popular (29% dos investidores).',
    source_name: 'Anbima',
    source_url: 'https://www.anbima.com.br/pt_br/especial/raio-x-do-investidor.htm',
  },
  {
    type: 'caso',
    tags: ['educacao-financeira', 'enef', 'orcamento-familiar'],
    title: 'ENEF — Estratégia Nacional de Educação Financeira',
    fact: 'A ENEF, instituída pelo Decreto 7.397/2010, é a política nacional permanente para promoção da educação financeira, conduzida pelo BACEN, CVM, Susep, Previc e órgãos da sociedade civil.',
    source_name: 'BACEN — ENEF',
    source_url: 'https://www.bcb.gov.br/cidadaniafinanceira/enef',
  },
  {
    type: 'estatistica',
    tags: ['pix', 'pagamentos', 'whatsapp-financeiro'],
    title: 'Adoção do Pix no Brasil — BACEN',
    fact: 'O Pix, lançado em novembro de 2020 pelo BACEN, atingiu mais de 165 milhões de usuários cadastrados e movimentou R$ 25 trilhões em 2024 — virou o principal meio de pagamento do país.',
    source_name: 'BACEN — Estatísticas Pix',
    source_url: 'https://www.bcb.gov.br/estabilidadefinanceira/estatisticaspix',
  },
];

async function main() {
  for (const s of SOURCES) {
    await exec(
      `INSERT INTO seo.data_sources (company_id, type, topic_tags, title, fact, source_name, source_url)
       VALUES ('company-meucaixa', $1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [s.type, s.tags, s.title, s.fact, s.source_name, s.source_url],
    );
  }
  logger.info({ total: SOURCES.length }, '[seed-data-sources] inserted');
  await closePool();
}

main().catch((err) => {
  logger.error({ err }, '[seed-data-sources] failed');
  process.exit(1);
});
