import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { AppConfigService } from '../../common/config/app.config';
import type { BotInterpretation } from './ai.types';

// Tipagem da resposta OpenRouter/OpenAI
interface ChatCompletionResponse {
  choices: Array<{
    message: { content: string };
  }>;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly appConfig: AppConfigService) {}

  /** Interpreta mensagem do usuário e retorna intent + dados estruturados */
  async interpretMessage(
    text: string,
    context: { segments: string[]; categories: string[] },
  ): Promise<BotInterpretation> {
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

      const content = data.choices[0]?.message.content;
      if (!content) {
        return this.fallbackInterpretation('Resposta vazia da IA');
      }

      const parsed: unknown = JSON.parse(content);
      return this.validateInterpretation(parsed);
    } catch (error) {
      if (error instanceof SyntaxError) {
        this.logger.warn('Resposta da IA não é JSON válido');
        return this.fallbackInterpretation('JSON inválido');
      }
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `OpenRouter HTTP ${error.response?.status ?? 'TIMEOUT'}`,
        );
      } else if (error instanceof Error) {
        this.logger.error(`OpenRouter: ${error.message}`);
      }
      return this.fallbackInterpretation('Erro de comunicação com IA');
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
  "data": { "amount": number|null, "description": string|null, "category": string|null, "segment": string|null, "supplier": string|null, "client": string|null, "date": string|null, "newAmount": number|null },
  "reasoning": string
}

INTENTS VÁLIDAS (qualquer outra coisa = "unknown"):
- "register_expense": registrar despesa (gatilhos: paguei, gastei, comprei, saiu, saída, pagar, despesa, débito)
- "register_income": registrar receita (gatilhos: recebi, entrada, ganhei, vendeu, venda, faturei, crédito)
- "query_balance": consultar saldo atual
- "query_expenses_month": ver despesas do mês
- "query_upcoming": ver vencimentos próximos
- "delete_last": apagar último lançamento
- "update_last": atualizar último lançamento
- "help": pediu ajuda sobre comandos do Meu Caixa
- "unknown": qualquer mensagem fora do escopo

CONTEXTO DA EMPRESA (use SOMENTE estes valores para matchear category/segment):
- Segmentos cadastrados: ${segmentos}
- Categorias cadastradas: ${categorias}

REGRAS DE PARSING:
- "k" ou "mil" = x1000 ("2k" = 2000, "1.5k" = 1500)
- Valores aceitos: "50", "R$50", "50 reais", "50,00", "R$ 1.500,00"
- Formato direto: "entrada 120 shopee" = receita de 120, descrição "shopee"
- Matchear categoria/segmento pelo nome mais próximo dos cadastrados acima
- Se não encontrar match exato, retorne null
- Datas relativas ("hoje", "ontem", "segunda") → ISO YYYY-MM-DD
- Sem data mencionada → null
- NUNCA invente categoria ou segmento que não esteja na lista acima

EXEMPLOS:
1. "gastei 50 no uber" → {"intent":"register_expense","confidence":0.95,"data":{"amount":50,"description":"Uber"}}
2. "recebi 2k do cliente silva" → {"intent":"register_income","confidence":0.95,"data":{"amount":2000,"description":"Cliente Silva","client":"Silva"}}
3. "paguei 150 energia" → {"intent":"register_expense","confidence":0.9,"data":{"amount":150,"description":"Energia"}}
4. "quanto tenho em caixa?" → {"intent":"query_balance","confidence":0.95,"data":{}}
5. "entrada 500 venda loja" → {"intent":"register_income","confidence":0.9,"data":{"amount":500,"description":"Venda loja"}}
6. "apaga o último" → {"intent":"delete_last","confidence":0.95,"data":{}}
7. "muda o último pra 80" → {"intent":"update_last","confidence":0.9,"data":{"newAmount":80}}
8. "oi tudo bem?" → {"intent":"unknown","confidence":1,"data":{}}
9. "qual a capital da França?" → {"intent":"unknown","confidence":1,"data":{}}
10. "me dá uma dica de investimento" → {"intent":"unknown","confidence":1,"data":{}}
11. "escreve um e-mail pra mim" → {"intent":"unknown","confidence":1,"data":{}}`;
  }

  /** Valida e normaliza a resposta da IA */
  private validateInterpretation(parsed: unknown): BotInterpretation {
    if (!parsed || typeof parsed !== 'object') {
      return this.fallbackInterpretation('Formato inválido');
    }

    const obj = parsed as Record<string, unknown>;

    const validIntents = [
      'register_expense',
      'register_income',
      'query_balance',
      'query_expenses_month',
      'query_upcoming',
      'delete_last',
      'update_last',
      'help',
      'unknown',
    ];

    const intent = validIntents.includes(obj['intent'] as string)
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
        newAmount:
          typeof rawData['newAmount'] === 'number'
            ? rawData['newAmount']
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
