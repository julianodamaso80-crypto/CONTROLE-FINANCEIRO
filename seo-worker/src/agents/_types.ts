export type Category =
  | 'controle-de-gastos'
  | 'orcamento-familiar'
  | 'whatsapp-financeiro'
  | 'educacao-financeira';

export type FunnelStage = 'top' | 'mid' | 'bottom';

export type Intent = 'informational' | 'navigational' | 'commercial' | 'transactional';

export type ArticleStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'awaiting_pr_merge'
  | 'published'
  | 'archived'
  | 'updating';

export type ReviewStatus = 'APROVADO' | 'APROVADO_COM_AJUSTES' | 'REPROVADO';

export type StrategistDecision =
  | 'APROVAR_ARTIGO_NOVO'
  | 'ATUALIZAR_ARTIGO_EXISTENTE'
  | 'VIRAR_SECAO_DE_ARTIGO_EXISTENTE'
  | 'REJEITAR_POR_REPETICAO'
  | 'REJEITAR_FORA_DO_ESCOPO';

export interface KeywordRow {
  id: string;
  keyword: string;
  category: Category;
  search_volume: number | null;
  difficulty: number | null;
  intent: Intent | null;
  status: string;
}

export interface ClusterRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: Category;
  main_keywords: string[];
}

export interface DataSourceRow {
  id: string;
  type: string;
  topic_tags: string[];
  title: string;
  fact: string;
  source_name: string;
  source_url: string | null;
}

export interface BriefingOutlineItem {
  h2: string;
  h3?: string[];
  notes?: string;
}

export interface BriefingFaq {
  q: string;
  a: string;
}

export interface BriefingInternalLink {
  anchor: string;
  url: string;
}
