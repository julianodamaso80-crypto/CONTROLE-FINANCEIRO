export type BotIntent =
  | 'register_expense'
  | 'register_income'
  | 'query_balance'
  | 'query_expenses_month'
  | 'query_upcoming'
  | 'query_report'
  | 'delete_last'
  | 'update_last'
  | 'help'
  | 'greeting'
  | 'unknown';

export type ReportPeriod =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'specific_month'
  | 'last_n_months'
  | 'last_n_days'
  | 'this_year'
  | 'custom';

export type ReportType = 'income' | 'expense' | 'profit' | 'all';

export type ReportFormat = 'text' | 'pdf';

export interface BotInterpretation {
  intent: BotIntent;
  confidence: number;
  data: {
    amount?: number;
    description?: string;
    category?: string;
    segment?: string;
    supplier?: string;
    client?: string;
    date?: string;
    newAmount?: number;
    period?: ReportPeriod;
    reportType?: ReportType;
    monthNumber?: number;
    year?: number;
    n?: number;
    startDate?: string;
    endDate?: string;
    groupBy?: 'category' | 'segment' | 'none';
    format?: ReportFormat;
  };
  reasoning?: string;
}
