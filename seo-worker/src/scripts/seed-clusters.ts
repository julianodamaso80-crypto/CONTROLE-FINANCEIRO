import { exec, closePool } from '../db/pg.js';
import { logger } from '../lib/logger.js';

const CLUSTERS = [
  {
    slug: 'controle-de-gastos',
    title: 'Controle de Gastos Pessoais',
    description:
      'Gestão de despesas mensais, métodos de registro de gastos, planilhas vs apps, automação financeira pessoal.',
    category: 'controle-de-gastos',
    search_intent: 'informational',
    main_keywords: [
      'controle de gastos',
      'como controlar gastos',
      'app de controle financeiro',
      'planilha de gastos',
      'gastos mensais',
      'organizar finanças',
    ],
  },
  {
    slug: 'orcamento-familiar',
    title: 'Orçamento Familiar e Planejamento Mensal',
    description:
      'Métodos de orçamento doméstico (50/30/20, envelopes), educação financeira familiar, economia em casa.',
    category: 'orcamento-familiar',
    search_intent: 'informational',
    main_keywords: [
      'orçamento familiar',
      'planejamento financeiro familiar',
      'método 50 30 20',
      'economia doméstica',
      'controle financeiro familiar',
      'orçamento mensal',
    ],
  },
  {
    slug: 'whatsapp-financeiro',
    title: 'WhatsApp e Automação Financeira',
    description:
      'Lançar despesas por WhatsApp, IA pra finanças pessoais, automação de registros, integração de bots financeiros.',
    category: 'whatsapp-financeiro',
    search_intent: 'commercial',
    main_keywords: [
      'controle financeiro por whatsapp',
      'app de finanças com whatsapp',
      'lançar gastos por whatsapp',
      'ia para finanças pessoais',
      'bot financeiro whatsapp',
      'registro de gastos automático',
    ],
  },
];

async function main() {
  for (const c of CLUSTERS) {
    await exec(
      `INSERT INTO seo.clusters (company_id, slug, title, description, category, search_intent, main_keywords)
       VALUES ('company-meucaixa', $1, $2, $3, $4, $5, $6)
       ON CONFLICT (company_id, slug) DO UPDATE
         SET title = EXCLUDED.title,
             description = EXCLUDED.description,
             category = EXCLUDED.category,
             search_intent = EXCLUDED.search_intent,
             main_keywords = EXCLUDED.main_keywords`,
      [c.slug, c.title, c.description, c.category, c.search_intent, c.main_keywords],
    );
    logger.info({ slug: c.slug }, '[seed-clusters] upserted');
  }
  await closePool();
}

main().catch((err) => {
  logger.error({ err }, '[seed-clusters] failed');
  process.exit(1);
});
