import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { AppConfigService } from '../../common/config/app.config';
import type {
  BotInterpretation,
  ReportFormat,
  ReportPeriod,
  ReportType,
} from './ai.types';

const VALID_PERIODS: ReportPeriod[] = [
  'today',
  'yesterday',
  'this_week',
  'last_week',
  'this_month',
  'last_month',
  'specific_month',
  'last_n_months',
  'last_n_days',
  'this_year',
  'custom',
];

const VALID_REPORT_TYPES: ReportType[] = [
  'income',
  'expense',
  'profit',
  'all',
];

const VALID_GROUP_BY = ['category', 'segment', 'none'] as const;

const VALID_FORMATS: ReportFormat[] = ['text', 'pdf'];

// Tipagem da resposta OpenRouter/OpenAI
interface ChatCompletionResponse {
  choices: Array<{
    message: { content: string };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model?: string;
}

export interface LlmUsage {
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
}

// Preços OpenRouter USD por 1M tokens (atualizar conforme necessário)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'openai/gpt-4o-mini': { input: 0.15, output: 0.60 },
  'google/gemini-2.5-flash': { input: 0.15, output: 0.60 },
};

function calcCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = MODEL_PRICING[model] ?? { input: 0.15, output: 0.60 };
  return (promptTokens * pricing.input + completionTokens * pricing.output) / 1_000_000;
}

function extractUsage(data: ChatCompletionResponse, fallbackModel: string): LlmUsage {
  const u = data.usage;
  const model = data.model ?? fallbackModel;
  const pt = u?.prompt_tokens ?? 0;
  const ct = u?.completion_tokens ?? 0;
  return { model, promptTokens: pt, completionTokens: ct, costUsd: calcCost(model, pt, ct) };
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly appConfig: AppConfigService) {}

  /**
   * Transcreve um áudio (voice note do WhatsApp em OGG/Opus) usando
   * google/gemini-2.5-flash via OpenRouter. Retorna o texto transcrito
   * em português, que é então processado pelo fluxo normal de
   * interpretMessage. gpt-4o-mini não suporta input_audio nativamente.
   */
  async transcribeAudio(
    base64: string,
    mimetype: string,
  ): Promise<{ text: string | null; usage: LlmUsage | null }> {
    // Inferir formato pelo mimetype
    let format = 'mp3';
    if (mimetype.includes('ogg')) format = 'ogg';
    else if (mimetype.includes('mp4')) format = 'mp4';
    else if (mimetype.includes('wav')) format = 'wav';
    else if (mimetype.includes('webm')) format = 'webm';
    else if (mimetype.includes('mpeg')) format = 'mp3';

    try {
      const { data } = await axios.post<ChatCompletionResponse>(
        `${this.appConfig.getOpenRouterBaseUrl()}/chat/completions`,
        {
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content:
                'Você transcreve áudios em português do Brasil. Retorne APENAS o texto falado, sem aspas, sem formatação, sem comentários, sem pontuação adicional. Se não for possível transcrever, retorne uma string vazia.',
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Transcreva esse áudio.' },
                {
                  type: 'input_audio',
                  input_audio: { data: base64, format },
                },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 500,
        },
        {
          headers: {
            Authorization: `Bearer ${this.appConfig.getOpenRouterApiKey()}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://meucaixa.store',
            'X-Title': 'Meu Caixa',
          },
          timeout: 45_000,
        },
      );

      const usage = extractUsage(data, 'google/gemini-2.5-flash');
      const text = data.choices[0]?.message.content?.trim();
      if (!text) return { text: null, usage };
      return { text, usage };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `transcribeAudio HTTP ${error.response?.status ?? 'TIMEOUT'}: ${String(error.response?.data?.error?.message ?? error.message)}`,
        );
      } else if (error instanceof Error) {
        this.logger.error(`transcribeAudio: ${error.message}`);
      }
      return { text: null, usage: null };
    }
  }

  /**
   * Interpreta uma imagem (extrato, cupom, recibo, nota fiscal) usando
   * gpt-4o-mini vision. Retorna uma BotInterpretation no mesmo formato
   * que interpretMessage, permitindo reaproveitar o fluxo de execução.
   */
  async interpretImage(
    base64: string,
    mimetype: string,
    caption: string | null,
    context: { segments: string[]; categories: string[] },
  ): Promise<{ interpretation: BotInterpretation; usage: LlmUsage | null }> {
    const systemPrompt = this.buildImagePrompt(context, caption);

    try {
      const { data } = await axios.post<ChatCompletionResponse>(
        `${this.appConfig.getOpenRouterBaseUrl()}/chat/completions`,
        {
          model: this.appConfig.getOpenRouterModel(),
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text:
                    caption ??
                    'Analise essa imagem e extraia a transação financeira.',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimetype};base64,${base64}`,
                  },
                },
              ],
            },
          ],
          temperature: 0.2,
          max_tokens: 600,
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            Authorization: `Bearer ${this.appConfig.getOpenRouterApiKey()}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://meucaixa.store',
            'X-Title': 'Meu Caixa',
          },
          timeout: 45_000,
        },
      );

      const usage = extractUsage(data, this.appConfig.getOpenRouterModel());
      const content = data.choices[0]?.message.content;
      if (!content) return { interpretation: this.fallbackInterpretation('Visão: resposta vazia'), usage };
      const parsed: unknown = JSON.parse(content);
      return { interpretation: this.validateInterpretation(parsed), usage };
    } catch (error) {
      if (error instanceof SyntaxError) {
        return { interpretation: this.fallbackInterpretation('Visão: JSON inválido'), usage: null };
      }
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `interpretImage HTTP ${error.response?.status ?? 'TIMEOUT'}`,
        );
      } else if (error instanceof Error) {
        this.logger.error(`interpretImage: ${error.message}`);
      }
      return { interpretation: this.fallbackInterpretation('Erro ao analisar imagem'), usage: null };
    }
  }

  private buildImagePrompt(
    context: { segments: string[]; categories: string[] },
    caption: string | null,
  ): string {
    const segmentos =
      context.segments.length > 0
        ? context.segments.join(', ')
        : 'nenhum cadastrado';
    const categorias =
      context.categories.length > 0
        ? context.categories.join(', ')
        : 'nenhuma cadastrada';
    const now = this.getNowInBrazil();

    return `Você é o analisador de imagens financeiras do Meu Caixa. O cliente enviou uma foto que pode ser: cupom fiscal, nota fiscal, comprovante de pagamento, print de extrato bancário, recibo, ou similar.

Sua tarefa: extrair a transação da imagem e retornar JSON no formato usado pelo classificador de texto.

${caption ? `Legenda enviada pelo cliente: "${caption}"` : ''}

Regras de extração:
- Identifique se é DESPESA (paga, saída) ou RECEITA (entrada, crédito)
- amount: valor TOTAL em número decimal (sem R$, sem formatação). Ex: 45.90
- description: descrição curta identificando o que é (ex: "Supermercado Pão de Açúcar", "Transferência recebida", "Nota fiscal Uber")
- date: data ISO YYYY-MM-DD se visível na imagem. Null se não identificar
- category: match com uma das categorias cadastradas abaixo, senão null
- segment: match com um dos segmentos cadastrados abaixo, senão null
- Se a imagem NÃO for de transação financeira (ex: foto aleatória, meme, selfie), retorne intent "unknown"
- Se a imagem tiver MÚLTIPLAS transações (um extrato cheio), retorne só a MAIS RECENTE e mencione isso no reasoning

DATA DE REFERÊNCIA (America/Sao_Paulo): hoje é ${now.weekday}, ${now.br} (ISO ${now.iso}). Se a data da imagem não for legível, retorne date=null.

Categorias cadastradas: ${categorias}
Segmentos cadastrados: ${segmentos}

FORMATO DE SAÍDA — APENAS JSON válido:
{
  "intent": "register_expense" | "register_income" | "unknown",
  "confidence": number (0 a 1),
  "data": {
    "amount": number|null,
    "description": string|null,
    "category": string|null,
    "segment": string|null,
    "date": string|null
  },
  "reasoning": string (explique brevemente o que você viu na imagem)
}`;
  }

  /** Interpreta mensagem do usuário e retorna intent + dados estruturados */
  async interpretMessage(
    text: string,
    context: { segments: string[]; categories: string[] },
  ): Promise<{ interpretation: BotInterpretation; usage: LlmUsage | null }> {
    const systemPrompt = this.buildSystemPrompt(context);

    try {
      const { data } = await axios.post<ChatCompletionResponse>(
        `${this.appConfig.getOpenRouterBaseUrl()}/chat/completions`,
        {
          model: this.appConfig.getOpenRouterModel(),
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text },
          ],
          temperature: 0.2,
          max_tokens: 500,
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            Authorization: `Bearer ${this.appConfig.getOpenRouterApiKey()}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://meucaixa.store',
            'X-Title': 'Meu Caixa',
          },
          timeout: 30_000,
        },
      );

      const usage = extractUsage(data, this.appConfig.getOpenRouterModel());
      const content = data.choices[0]?.message.content;
      if (!content) {
        return { interpretation: this.fallbackInterpretation('Resposta vazia da IA'), usage };
      }

      const parsed: unknown = JSON.parse(content);
      return { interpretation: this.validateInterpretation(parsed), usage };
    } catch (error) {
      if (error instanceof SyntaxError) {
        this.logger.warn('Resposta da IA não é JSON válido');
        return { interpretation: this.fallbackInterpretation('JSON inválido'), usage: null };
      }
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `OpenRouter HTTP ${error.response?.status ?? 'TIMEOUT'}`,
        );
      } else if (error instanceof Error) {
        this.logger.error(`OpenRouter: ${error.message}`);
      }
      return { interpretation: this.fallbackInterpretation('Erro de comunicação com IA'), usage: null };
    }
  }

  /** Constrói o prompt de sistema com contexto da empresa */
  private buildSystemPrompt(context: {
    segments: string[];
    categories: string[];
  }): string {
    const segmentos =
      context.segments.length > 0
        ? context.segments.join(', ')
        : 'nenhum cadastrado';
    const categorias =
      context.categories.length > 0
        ? context.categories.join(', ')
        : 'nenhuma cadastrada';
    const now = this.getNowInBrazil();

    return `Você é o classificador de mensagens do Meu Caixa, um sistema de controle financeiro empresarial.

ESCOPO RÍGIDO — você SÓ classifica mensagens relacionadas a:
- Registrar despesas e receitas da empresa
- Consultar saldo, despesas, vencimentos
- Gerenciar lançamentos da empresa (apagar, editar)
- Pedir ajuda sobre os comandos do Meu Caixa

Você NÃO responde, NÃO opina, NÃO conversa, NÃO dá dicas, NÃO faz cálculos genéricos, NÃO fala de outros assuntos, NÃO escreve textos. Você é APENAS um classificador de intenção. Se a mensagem não se encaixa em nenhuma intenção financeira do Meu Caixa, retorne intent "unknown".

PROIBIDO classificar como qualquer intent válida se a mensagem for sobre:
- Conversas casuais ("oi", "bom dia", "tudo bem")
- Perguntas gerais (clima, notícias, conselhos, opiniões)
- Outros sistemas, outros apps, outras empresas
- Pedidos para escrever, traduzir, resumir, ensinar
- Qualquer tópico fora de finanças empresariais do próprio usuário
Para esses casos: intent = "unknown".

FORMATO DE SAÍDA — APENAS JSON válido, sem markdown, sem backticks, sem explicações:
{
  "intent": string,
  "confidence": number (0 a 1),
  "data": {
    "amount": number|null,
    "description": string|null,
    "category": string|null,
    "segment": string|null,
    "supplier": string|null,
    "client": string|null,
    "date": string|null,
    "dueDate": string|null,
    "status": string|null,
    "newAmount": number|null,
    "period": string|null,
    "reportType": string|null,
    "monthNumber": number|null,
    "year": number|null,
    "n": number|null,
    "startDate": string|null,
    "endDate": string|null,
    "groupBy": string|null,
    "format": string|null
  },
  "reasoning": string
}

INTENTS VÁLIDAS (qualquer outra coisa = "unknown"):
- "register_expense": registrar despesa. DOIS SUB-CASOS — preencha SEMPRE o campo "status":
  * "status": "PAID" → gasto já pago (gatilhos: "paguei", "gastei", "comprei", "saiu", "débito"). O backend vai usar a data mencionada (ou hoje) como dataDePagamento.
  * "status": "PENDING" → boleto/conta a pagar no futuro (gatilhos: "tenho um boleto", "vai vencer", "vence dia X", "conta a pagar", "pra pagar dia X", "lembra dia X", "me avisa dia X"). NESTE CASO, preencha "dueDate" (ISO YYYY-MM-DD) com o vencimento. O backend envia lembrete automático às 9h do dia do vencimento.
- "register_income": registrar receita. Mesmos dois sub-casos via "status":
  * "status": "PAID" → recebimento já entrou (gatilhos: "recebi", "entrou", "ganhei", "venda", "faturei").
  * "status": "PENDING" → previsão de recebimento ("cliente vai pagar dia X", "nota a receber vence dia X"). Preencha "dueDate".
- "query_balance": consultar saldo atual
- "query_expenses_month": ver despesas do mês corrente (atalho)
- "query_upcoming": ver vencimentos próximos (contas a pagar/receber)
- "query_report": RELATÓRIO de um período. Use quando o cliente pedir resumo/levantamento/análise de qualquer período. Preencha os campos do "data":
  * period: "today" | "yesterday" | "this_week" | "last_week" | "this_month" | "last_month" | "specific_month" | "last_n_months" | "last_n_days" | "this_year" | "custom"
  * reportType: "income" (só receitas) | "expense" (só despesas) | "profit" (lucro = receita - despesa) | "all" (padrão, mostra tudo)
  * monthNumber (1-12) e year (YYYY) quando period="specific_month"
  * n quando period="last_n_months" ou "last_n_days"
  * startDate e endDate (ISO YYYY-MM-DD) quando period="custom"
  * groupBy: "category" | "segment" | "none" (padrão "category")
  * format: "pdf" QUANDO o cliente pedir explicitamente em PDF ("manda em pdf", "quero o pdf", "relatório em pdf", "gera o pdf", "arquivo pdf", "documento pdf"). "text" no caso padrão (resumo no chat). LIMITE: só 4 PDFs por mês por empresa — mesmo assim sempre respeite o pedido do cliente, o backend controla o rate limit.
- "delete_last": apagar último lançamento
- "update_last": atualizar último lançamento
- "help": pediu ajuda sobre comandos do Meu Caixa
- "greeting": saudação curta sem pedido específico (oi, ola, bom dia, boa tarde, boa noite, tudo bem, tudo certo, eai, blz, opa, salve)
- "unknown": qualquer mensagem fora do escopo (perguntas gerais, conselhos, escrita, traduções, outros temas)

DATA DE REFERÊNCIA (America/Sao_Paulo): hoje é ${now.weekday}, ${now.br} (ISO ${now.iso}). Use SEMPRE esta data pra resolver "hoje", "ontem", "anteontem", "segunda passada", etc. NUNCA invente data — se o cliente não mencionar, retorne date=null (o backend preenche com a data de hoje em Brasília).

CONTEXTO DA EMPRESA (use SOMENTE estes valores para matchear category/segment):
- Segmentos cadastrados: ${segmentos}
- Categorias cadastradas (formato "Pai > Sub1, Sub2"): ${categorias}

REGRAS DE PARSING:
- "k" ou "mil" = x1000 ("2k" = 2000, "1.5k" = 1500)
- Valores aceitos: "50", "R$50", "50 reais", "50,00", "R$ 1.500,00"
- Formato direto: "entrada 120 shopee" = receita de 120, descrição "shopee"
- CATEGORIAS HIERÁRQUICAS: as categorias acima usam "Pai > Sub1, Sub2".
  * Se a palavra mencionada matchear uma SUBCATEGORIA (ex: "bobina"), retorne o nome da subcategoria no campo "category" (ex: "Bobina"). O backend resolve o parentId automaticamente.
  * Se matchear só o PAI (ex: "insumos"), retorne o nome do pai.
  * Se não encontrar match, retorne null.
- Matchear segmento pelo nome mais próximo dos cadastrados
- Se não encontrar match exato, retorne null
- Datas relativas ("hoje", "ontem", "segunda") → ISO YYYY-MM-DD
- Sem data mencionada → null
- NUNCA invente categoria ou segmento que não esteja na lista acima
- TEXTO DE PDF: o input pode ser texto extraído de um PDF (nota fiscal, boleto, extrato). Nesse caso será longo e com formatação irregular. Extraia: valor total, descrição, data, e classifique como register_expense ou register_income. Se o PDF tiver múltiplas linhas de transação, extraia o TOTAL GERAL. Se não conseguir determinar se é despesa ou receita, retorne intent "unknown" com reasoning explicando a dúvida.

EXEMPLOS:
1. "gastei 50 no uber" → {"intent":"register_expense","confidence":0.95,"data":{"amount":50,"description":"Uber"}}
2. "recebi 2k do cliente silva" → {"intent":"register_income","confidence":0.95,"data":{"amount":2000,"description":"Cliente Silva","client":"Silva"}}
3. "paguei 150 energia" → {"intent":"register_expense","confidence":0.9,"data":{"amount":150,"description":"Energia"}}
4. "quanto tenho em caixa?" → {"intent":"query_balance","confidence":0.95,"data":{}}
5. "entrada 500 venda loja" → {"intent":"register_income","confidence":0.9,"data":{"amount":500,"description":"Venda loja"}}
6. "apaga o último" → {"intent":"delete_last","confidence":0.95,"data":{}}
7. "muda o último pra 80" → {"intent":"update_last","confidence":0.9,"data":{"newAmount":80}}
8. "quanto ganhei essa semana" → {"intent":"query_report","confidence":0.95,"data":{"period":"this_week","reportType":"income","groupBy":"category"}}
9. "relatório do mês" → {"intent":"query_report","confidence":0.95,"data":{"period":"this_month","reportType":"all","groupBy":"category"}}
10. "quanto gastei em janeiro" → {"intent":"query_report","confidence":0.95,"data":{"period":"specific_month","monthNumber":1,"year":2026,"reportType":"expense","groupBy":"category"}}
11. "lucro dos últimos 3 meses" → {"intent":"query_report","confidence":0.95,"data":{"period":"last_n_months","n":3,"reportType":"profit","groupBy":"none"}}
12. "levantamento de janeiro a março" → {"intent":"query_report","confidence":0.9,"data":{"period":"custom","startDate":"2026-01-01","endDate":"2026-03-31","reportType":"all","groupBy":"category"}}
13. "resumo de hoje" → {"intent":"query_report","confidence":0.95,"data":{"period":"today","reportType":"all","groupBy":"category"}}
14. "quanto ganhei semana passada" → {"intent":"query_report","confidence":0.95,"data":{"period":"last_week","reportType":"income","groupBy":"category"}}
15. "faturamento esse ano" → {"intent":"query_report","confidence":0.9,"data":{"period":"this_year","reportType":"income","groupBy":"none"}}
15a. "me manda o pdf do mês" → {"intent":"query_report","confidence":0.95,"data":{"period":"this_month","reportType":"all","groupBy":"category","format":"pdf"}}
15b. "quero o relatório em pdf de janeiro" → {"intent":"query_report","confidence":0.95,"data":{"period":"specific_month","monthNumber":1,"year":2026,"reportType":"all","groupBy":"category","format":"pdf"}}
15c. "gera o pdf dos últimos 30 dias" → {"intent":"query_report","confidence":0.95,"data":{"period":"last_n_days","n":30,"reportType":"all","groupBy":"category","format":"pdf"}}
15d. "tenho um boleto de 500 de energia que vai vencer dia 30" → {"intent":"register_expense","confidence":0.95,"data":{"amount":500,"description":"Boleto energia","status":"PENDING","dueDate":"2026-04-30"}}
15e. "me lembra dia 20 do mês que vem do boleto do aluguel, 2500" → {"intent":"register_expense","confidence":0.9,"data":{"amount":2500,"description":"Aluguel","status":"PENDING","dueDate":"2026-05-20"}}
15f. "cliente vai pagar 3mil dia 25" → {"intent":"register_income","confidence":0.9,"data":{"amount":3000,"description":"Receita cliente","status":"PENDING","dueDate":"2026-04-25"}}
15g. "paguei 80 de uber" → {"intent":"register_expense","confidence":0.95,"data":{"amount":80,"description":"Uber","status":"PAID"}}
16. "oi" → {"intent":"greeting","confidence":1,"data":{}}
17. "oie" → {"intent":"greeting","confidence":1,"data":{}}
18. "bom dia" → {"intent":"greeting","confidence":1,"data":{}}
19. "tudo bem?" → {"intent":"greeting","confidence":1,"data":{}}
20. "eai blz" → {"intent":"greeting","confidence":1,"data":{}}
21. "qual a capital da França?" → {"intent":"unknown","confidence":1,"data":{}}
22. "me dá uma dica de investimento" → {"intent":"unknown","confidence":1,"data":{}}
23. "escreve um e-mail pra mim" → {"intent":"unknown","confidence":1,"data":{}}
24. "qual a melhor ação pra comprar" → {"intent":"unknown","confidence":1,"data":{}}`;
  }

  /** Data atual em São Paulo pra IA resolver "hoje", "ontem", "segunda" corretamente */
  private getNowInBrazil(): { iso: string; br: string; weekday: string } {
    const now = new Date();
    const iso = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
    const [y, m, d] = iso.split('-');
    const weekday = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      weekday: 'long',
    }).format(now);
    return { iso, br: `${d}/${m}/${y}`, weekday };
  }

  /** Valida e normaliza a resposta da IA */
  private validateInterpretation(parsed: unknown): BotInterpretation {
    if (!parsed || typeof parsed !== 'object') {
      return this.fallbackInterpretation('Formato inválido');
    }

    const obj = parsed as Record<string, unknown>;

    const validIntents: BotInterpretation['intent'][] = [
      'register_expense',
      'register_income',
      'query_balance',
      'query_expenses_month',
      'query_upcoming',
      'query_report',
      'delete_last',
      'update_last',
      'help',
      'greeting',
      'unknown',
    ];

    const intent = validIntents.includes(
      obj['intent'] as BotInterpretation['intent'],
    )
      ? (obj['intent'] as BotInterpretation['intent'])
      : 'unknown';

    const confidence =
      typeof obj['confidence'] === 'number' ? obj['confidence'] : 0;

    const rawData =
      typeof obj['data'] === 'object' && obj['data'] !== null
        ? (obj['data'] as Record<string, unknown>)
        : {};

    return {
      intent,
      confidence,
      data: {
        amount:
          typeof rawData['amount'] === 'number'
            ? rawData['amount']
            : undefined,
        description:
          typeof rawData['description'] === 'string'
            ? rawData['description']
            : undefined,
        category:
          typeof rawData['category'] === 'string'
            ? rawData['category']
            : undefined,
        segment:
          typeof rawData['segment'] === 'string'
            ? rawData['segment']
            : undefined,
        supplier:
          typeof rawData['supplier'] === 'string'
            ? rawData['supplier']
            : undefined,
        client:
          typeof rawData['client'] === 'string'
            ? rawData['client']
            : undefined,
        date:
          typeof rawData['date'] === 'string' ? rawData['date'] : undefined,
        dueDate:
          typeof rawData['dueDate'] === 'string'
            ? rawData['dueDate']
            : undefined,
        status:
          rawData['status'] === 'PAID' || rawData['status'] === 'PENDING'
            ? (rawData['status'] as 'PAID' | 'PENDING')
            : undefined,
        newAmount:
          typeof rawData['newAmount'] === 'number'
            ? rawData['newAmount']
            : undefined,
        period: VALID_PERIODS.includes(rawData['period'] as ReportPeriod)
          ? (rawData['period'] as ReportPeriod)
          : undefined,
        reportType: VALID_REPORT_TYPES.includes(
          rawData['reportType'] as ReportType,
        )
          ? (rawData['reportType'] as ReportType)
          : undefined,
        monthNumber:
          typeof rawData['monthNumber'] === 'number'
            ? rawData['monthNumber']
            : undefined,
        year:
          typeof rawData['year'] === 'number' ? rawData['year'] : undefined,
        n: typeof rawData['n'] === 'number' ? rawData['n'] : undefined,
        startDate:
          typeof rawData['startDate'] === 'string'
            ? rawData['startDate']
            : undefined,
        endDate:
          typeof rawData['endDate'] === 'string'
            ? rawData['endDate']
            : undefined,
        groupBy: VALID_GROUP_BY.includes(
          rawData['groupBy'] as (typeof VALID_GROUP_BY)[number],
        )
          ? (rawData['groupBy'] as 'category' | 'segment' | 'none')
          : undefined,
        format: VALID_FORMATS.includes(rawData['format'] as ReportFormat)
          ? (rawData['format'] as ReportFormat)
          : undefined,
      },
      reasoning:
        typeof obj['reasoning'] === 'string' ? obj['reasoning'] : undefined,
    };
  }

  /** Retorno seguro quando a IA falha */
  private fallbackInterpretation(reason: string): BotInterpretation {
    return {
      intent: 'unknown',
      confidence: 0,
      data: {},
      reasoning: reason,
    };
  }
}
