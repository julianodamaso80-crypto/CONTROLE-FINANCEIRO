import { exec, closePool } from '../db/pg.js';
import { logger } from '../lib/logger.js';

const SEEDS = [
  // controle-de-gastos
  { seed: 'como controlar gastos mensais', category: 'controle-de-gastos', funnel_stage: 'top', cluster_slug: 'controle-de-gastos' },
  { seed: 'aplicativo de controle financeiro pessoal', category: 'controle-de-gastos', funnel_stage: 'mid', cluster_slug: 'controle-de-gastos' },
  { seed: 'planilha de gastos pessoais', category: 'controle-de-gastos', funnel_stage: 'top', cluster_slug: 'controle-de-gastos' },
  { seed: 'como organizar as finanças pessoais', category: 'controle-de-gastos', funnel_stage: 'top', cluster_slug: 'controle-de-gastos' },
  { seed: 'controle de gastos gratuito', category: 'controle-de-gastos', funnel_stage: 'bottom', cluster_slug: 'controle-de-gastos' },
  { seed: 'app de finanças pessoais melhor', category: 'controle-de-gastos', funnel_stage: 'mid', cluster_slug: 'controle-de-gastos' },
  { seed: 'categorizar gastos automaticamente', category: 'controle-de-gastos', funnel_stage: 'mid', cluster_slug: 'controle-de-gastos' },
  { seed: 'como saber pra onde vai meu dinheiro', category: 'controle-de-gastos', funnel_stage: 'top', cluster_slug: 'controle-de-gastos' },

  // orcamento-familiar
  { seed: 'como fazer orçamento familiar', category: 'orcamento-familiar', funnel_stage: 'top', cluster_slug: 'orcamento-familiar' },
  { seed: 'método 50 30 20', category: 'orcamento-familiar', funnel_stage: 'top', cluster_slug: 'orcamento-familiar' },
  { seed: 'planejamento financeiro mensal família', category: 'orcamento-familiar', funnel_stage: 'mid', cluster_slug: 'orcamento-familiar' },
  { seed: 'como economizar dinheiro em casa', category: 'orcamento-familiar', funnel_stage: 'top', cluster_slug: 'orcamento-familiar' },
  { seed: 'sair das dívidas em 6 meses', category: 'orcamento-familiar', funnel_stage: 'mid', cluster_slug: 'orcamento-familiar' },
  { seed: 'orçamento doméstico passo a passo', category: 'orcamento-familiar', funnel_stage: 'top', cluster_slug: 'orcamento-familiar' },
  { seed: 'como pagar dívidas atrasadas', category: 'orcamento-familiar', funnel_stage: 'mid', cluster_slug: 'orcamento-familiar' },
  { seed: 'reserva de emergência quanto', category: 'orcamento-familiar', funnel_stage: 'mid', cluster_slug: 'orcamento-familiar' },

  // whatsapp-financeiro
  { seed: 'controle financeiro pelo whatsapp', category: 'whatsapp-financeiro', funnel_stage: 'commercial', cluster_slug: 'whatsapp-financeiro' },
  { seed: 'app que registra gastos por whatsapp', category: 'whatsapp-financeiro', funnel_stage: 'bottom', cluster_slug: 'whatsapp-financeiro' },
  { seed: 'lançar despesas por mensagem de texto', category: 'whatsapp-financeiro', funnel_stage: 'mid', cluster_slug: 'whatsapp-financeiro' },
  { seed: 'inteligência artificial para finanças pessoais', category: 'whatsapp-financeiro', funnel_stage: 'top', cluster_slug: 'whatsapp-financeiro' },
  { seed: 'como mandar nota fiscal pelo whatsapp e categorizar', category: 'whatsapp-financeiro', funnel_stage: 'mid', cluster_slug: 'whatsapp-financeiro' },
  { seed: 'bot financeiro whatsapp', category: 'whatsapp-financeiro', funnel_stage: 'commercial', cluster_slug: 'whatsapp-financeiro' },
  { seed: 'meu caixa app', category: 'whatsapp-financeiro', funnel_stage: 'bottom', cluster_slug: 'whatsapp-financeiro' },

  // educacao-financeira (coringa)
  { seed: 'como sair do cheque especial', category: 'educacao-financeira', funnel_stage: 'mid', cluster_slug: 'orcamento-familiar' },
  { seed: 'o que é score de crédito', category: 'educacao-financeira', funnel_stage: 'top', cluster_slug: 'orcamento-familiar' },
  { seed: 'como negociar dívidas no serasa', category: 'educacao-financeira', funnel_stage: 'mid', cluster_slug: 'orcamento-familiar' },
  { seed: 'cadastro positivo vale a pena', category: 'educacao-financeira', funnel_stage: 'mid', cluster_slug: 'orcamento-familiar' },
];

async function main() {
  for (const s of SEEDS) {
    await exec(
      `INSERT INTO seo.seed_keywords (company_id, seed, category, funnel_stage, cluster_slug)
       VALUES ('company-meucaixa', $1, $2, $3, $4)
       ON CONFLICT (company_id, seed) DO NOTHING`,
      [s.seed, s.category, s.funnel_stage, s.cluster_slug],
    );
  }
  logger.info({ total: SEEDS.length }, '[seed-keywords] inserted');
  await closePool();
}

main().catch((err) => {
  logger.error({ err }, '[seed-keywords] failed');
  process.exit(1);
});
