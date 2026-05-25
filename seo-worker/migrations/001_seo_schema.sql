-- ============================================================
-- MeuCaixa SEO Pipeline — Schema base
-- Cria schema `seo` separado do Prisma do app principal
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "vector";

CREATE SCHEMA IF NOT EXISTS seo;

-- ---------- keywords ----------
CREATE TABLE IF NOT EXISTS seo.keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL DEFAULT 'company-meucaixa',
  keyword text NOT NULL,
  keyword_normalized text GENERATED ALWAYS AS (lower(unaccent(keyword))) STORED,
  category text CHECK (category IN ('controle-de-gastos','orcamento-familiar','whatsapp-financeiro','educacao-financeira')),
  source text NOT NULL,
  search_volume int,
  difficulty int,
  cpc_brl numeric(8,2),
  intent text CHECK (intent IN ('informational','navigational','commercial','transactional')),
  commercial_potential int,
  serp_competitors jsonb,
  status text NOT NULL DEFAULT 'pending',
  first_research_batch_id uuid,
  last_research_batch_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, keyword_normalized)
);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_status ON seo.keywords (company_id, status);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_trgm ON seo.keywords USING gin (keyword_normalized gin_trgm_ops);

-- ---------- clusters ----------
CREATE TABLE IF NOT EXISTS seo.clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL DEFAULT 'company-meucaixa',
  slug text NOT NULL,
  title text NOT NULL,
  description text,
  pillar_article_id uuid,
  category text,
  search_intent text,
  main_keywords text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, slug)
);

-- ---------- topics ----------
CREATE TABLE IF NOT EXISTS seo.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL DEFAULT 'company-meucaixa',
  title text NOT NULL,
  main_keyword_id uuid REFERENCES seo.keywords(id),
  secondary_keywords text[],
  category text,
  intent text,
  audience text,
  pain_point text,
  pillar_page text,
  cluster_id uuid REFERENCES seo.clusters(id),
  funnel_stage text CHECK (funnel_stage IN ('top','mid','bottom')),
  anti_repetition_score numeric(4,3),
  similar_articles uuid[],
  decision text CHECK (decision IN (
    'APROVAR_ARTIGO_NOVO',
    'ATUALIZAR_ARTIGO_EXISTENTE',
    'VIRAR_SECAO_DE_ARTIGO_EXISTENTE',
    'REJEITAR_POR_REPETICAO',
    'REJEITAR_FORA_DO_ESCOPO',
    'PENDENTE'
  )) DEFAULT 'PENDENTE',
  decision_reason text,
  target_article_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- briefings ----------
CREATE TABLE IF NOT EXISTS seo.briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES seo.topics(id),
  seo_title text NOT NULL,
  h1 text NOT NULL,
  outline jsonb NOT NULL,
  faqs jsonb,
  internal_links jsonb,
  legal_notes text,
  example_suggestions text,
  image_suggestion text,
  is_update_of uuid,
  llm_model_used text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- articles ----------
CREATE TABLE IF NOT EXISTS seo.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL DEFAULT 'company-meucaixa',
  topic_id uuid REFERENCES seo.topics(id),
  briefing_id uuid REFERENCES seo.briefings(id),
  cluster_id uuid REFERENCES seo.clusters(id),
  funnel_stage text CHECK (funnel_stage IN ('top','mid','bottom')),
  is_pillar boolean DEFAULT false,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  url text GENERATED ALWAYS AS ('https://meucaixa.store/blog/' || slug) STORED,
  meta_title text,
  meta_description text,
  category text,
  main_keyword text,
  secondary_keywords text[],
  mdx_path text,
  mdx_sha text,
  mdx_content text,
  cover_image_url text,
  pr_url text,
  pr_branch text,
  status text NOT NULL DEFAULT 'draft',
  review_status text,
  review_notes text,
  embedding vector(384),
  word_count int,
  read_time_min int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  archived_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_seo_articles_status ON seo.articles (company_id, status);
CREATE INDEX IF NOT EXISTS idx_seo_articles_cluster ON seo.articles (cluster_id);
CREATE INDEX IF NOT EXISTS idx_seo_articles_embedding ON seo.articles USING hnsw (embedding vector_cosine_ops);

-- ---------- article_versions ----------
CREATE TABLE IF NOT EXISTS seo.article_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES seo.articles(id) ON DELETE CASCADE,
  version int NOT NULL,
  diff_summary text,
  mdx_content text,
  changed_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (article_id, version)
);

-- ---------- indexing_log ----------
CREATE TABLE IF NOT EXISTS seo.indexing_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES seo.articles(id) ON DELETE CASCADE,
  url text NOT NULL,
  channel text NOT NULL,
  action text NOT NULL,
  response_status int,
  response_body jsonb,
  error text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seo_indexing_log_article ON seo.indexing_log (article_id, channel, occurred_at DESC);

-- ---------- metrics_daily ----------
CREATE TABLE IF NOT EXISTS seo.metrics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES seo.articles(id) ON DELETE CASCADE,
  url text NOT NULL,
  date date NOT NULL,
  source text NOT NULL,
  impressions int,
  clicks int,
  ctr numeric(6,4),
  avg_position numeric(5,2),
  ga4_sessions int,
  ga4_engaged_sessions int,
  ga4_engagement_rate numeric(6,4),
  ga4_avg_engagement_time_sec numeric(8,2),
  ga4_conversions int,
  whatsapp_clicks int,
  UNIQUE (article_id, url, date, source)
);
CREATE INDEX IF NOT EXISTS idx_seo_metrics_daily_date ON seo.metrics_daily (date DESC, source);

-- ---------- recommendations ----------
CREATE TABLE IF NOT EXISTS seo.recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  article_id uuid REFERENCES seo.articles(id),
  priority int CHECK (priority BETWEEN 1 AND 5),
  recommendation text NOT NULL,
  reason text NOT NULL,
  data jsonb,
  status text DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz
);

-- ---------- agent_runs ----------
CREATE TABLE IF NOT EXISTS seo.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  triggered_by text,
  input jsonb,
  output jsonb,
  llm_provider text,
  llm_model text,
  llm_input_tokens int,
  llm_output_tokens int,
  llm_cost_usd numeric(10,6),
  status text NOT NULL DEFAULT 'running',
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms int
);
CREATE INDEX IF NOT EXISTS idx_seo_agent_runs_agent ON seo.agent_runs (agent_id, started_at DESC);

-- ---------- dataforseo_calls ----------
CREATE TABLE IF NOT EXISTS seo.dataforseo_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  request_body jsonb,
  cost_usd numeric(10,6),
  cached boolean DEFAULT false,
  called_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- research_batches ----------
CREATE TABLE IF NOT EXISTS seo.research_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL DEFAULT 'company-meucaixa',
  triggered_by text,
  total_keywords int DEFAULT 0,
  total_cost_usd numeric(10,6) DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

-- ---------- data_sources (Information Gain) ----------
CREATE TABLE IF NOT EXISTS seo.data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL DEFAULT 'company-meucaixa',
  type text NOT NULL CHECK (type IN ('estatistica','tabela','caso','norma','calculo','localizacao')),
  topic_tags text[],
  title text NOT NULL,
  fact text NOT NULL,
  source_name text NOT NULL,
  source_url text,
  valid_until date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seo_data_sources_tags ON seo.data_sources USING gin (topic_tags);

-- ---------- seed_keywords ----------
CREATE TABLE IF NOT EXISTS seo.seed_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL DEFAULT 'company-meucaixa',
  seed text NOT NULL,
  category text,
  funnel_stage text,
  cluster_slug text,
  last_used_at timestamptz,
  priority int DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, seed)
);
CREATE INDEX IF NOT EXISTS idx_seed_keywords_rotation ON seo.seed_keywords (company_id, category, last_used_at NULLS FIRST);

-- ---------- skill_invocations ----------
CREATE TABLE IF NOT EXISTS seo.skill_invocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  command text NOT NULL,
  args jsonb,
  invoked_by text,
  status text DEFAULT 'running',
  output jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms int
);

-- ---------- clusters.pillar_article_id FK (deferred — circular ref) ----------
DO $$ BEGIN
  ALTER TABLE seo.clusters
    ADD CONSTRAINT fk_clusters_pillar_article
    FOREIGN KEY (pillar_article_id) REFERENCES seo.articles(id)
    DEFERRABLE INITIALLY DEFERRED;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- view consolidada ----------
CREATE OR REPLACE VIEW seo.v_article_performance AS
SELECT a.id, a.title, a.slug, a.url, a.category, a.cluster_id, a.funnel_stage, a.status, a.published_at,
       SUM(CASE WHEN m.source='gsc' THEN m.impressions ELSE 0 END) AS impressions_30d,
       SUM(CASE WHEN m.source='gsc' THEN m.clicks ELSE 0 END) AS clicks_30d,
       AVG(CASE WHEN m.source='gsc' THEN m.avg_position END) AS avg_position_30d,
       SUM(CASE WHEN m.source='ga4' THEN m.ga4_sessions ELSE 0 END) AS sessions_30d
FROM seo.articles a
LEFT JOIN seo.metrics_daily m
       ON m.article_id = a.id
      AND m.date >= current_date - interval '30 days'
GROUP BY a.id;
