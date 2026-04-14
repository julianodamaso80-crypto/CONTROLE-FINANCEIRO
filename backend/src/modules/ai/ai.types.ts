export type BotIntent =
  | 'register_expense'
  | 'register_income'
  | 'query_balance'
  | 'query_expenses_month'
  | 'query_upcoming'
  | 'delete_last'
  | 'update_last'
  | 'help'
  | 'unknown';

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
  };
  reasoning?: string;
}
