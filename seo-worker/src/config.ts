import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.string().default('production'),
  PORT: z.coerce.number().default(8080),
  LOG_LEVEL: z.string().default('info'),
  TZ: z.string().default('America/Sao_Paulo'),
  COMPANY_ID: z.string().default('company-meucaixa'),
  SITE_URL: z.string().default('https://meucaixa.store'),

  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),

  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().default('https://openrouter.ai/api/v1'),
  AI_MODEL_GENERATOR: z.string().default('google/gemini-2.5-flash'),
  AI_MODEL_CLASSIFIER: z.string().default('google/gemini-2.5-flash'),

  GITHUB_TOKEN: z.string().optional(),
  GITHUB_REPO: z.string().optional(),
  GITHUB_BRANCH_BASE: z.string().default('main'),
  WEBSITE_CONTENT_DIR: z.string().default('frontend/content/blog'),

  TRIGGER_SECRET: z.string().default('change-me'),

  AUTO_PUBLISH_ENABLED: z.coerce.boolean().default(true),
  DAILY_ARTICLE_LIMIT: z.coerce.number().default(3),
  DAILY_ARTICLE_BONUS: z.coerce.number().default(1),
  WEEKLY_KEYWORD_LIMIT: z.coerce.number().default(80),
  WORDS_PER_ARTICLE_MIN: z.coerce.number().default(1300),
  WORDS_PER_ARTICLE_MAX: z.coerce.number().default(1500),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REFRESH_TOKEN: z.string().optional(),
  GSC_SITE_URL: z.string().optional(),
  GA4_PROPERTY_ID: z.string().optional(),

  BING_API_KEY: z.string().optional(),
  BING_SITE_URL: z.string().optional(),
  INDEXNOW_KEY: z.string().optional(),

  DATAFORSEO_LOGIN: z.string().optional(),
  DATAFORSEO_PASSWORD: z.string().optional(),
  DATAFORSEO_DAILY_BUDGET_USD: z.coerce.number().default(2),

  EASYPANEL_SSH_KEY: z.string().optional(),
  EASYPANEL_HOST: z.string().optional(),
  EASYPANEL_PROJECT: z.string().default('meucaixa'),
});

export const config = schema.parse(process.env);

export function resolveLlmModel(tier: 'main' | 'light') {
  return {
    model: tier === 'main' ? config.AI_MODEL_GENERATOR : config.AI_MODEL_CLASSIFIER,
  };
}

export function credentialsSnapshot() {
  return {
    db: Boolean(config.DATABASE_URL),
    redis: Boolean(config.REDIS_URL),
    openrouter: Boolean(config.OPENROUTER_API_KEY),
    llm_models: { main: config.AI_MODEL_GENERATOR, light: config.AI_MODEL_CLASSIFIER },
    dataforseo: Boolean(config.DATAFORSEO_LOGIN && config.DATAFORSEO_PASSWORD),
    gsc: Boolean(config.GOOGLE_REFRESH_TOKEN && config.GSC_SITE_URL),
    ga4: Boolean(config.GOOGLE_REFRESH_TOKEN && config.GA4_PROPERTY_ID),
    bing: Boolean(config.BING_API_KEY && config.BING_SITE_URL),
    indexnow: Boolean(config.INDEXNOW_KEY),
    github: Boolean(config.GITHUB_TOKEN && config.GITHUB_REPO),
    trigger_secret: config.TRIGGER_SECRET !== 'change-me',
  };
}
