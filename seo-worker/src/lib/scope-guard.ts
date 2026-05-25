export const FORBIDDEN_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /\bfique rico r[áa]pido\b/i, reason: 'frase proibida: "fique rico rápido"' },
  { pattern: /\brendimento garantido\b/i, reason: 'frase proibida: "rendimento garantido"' },
  { pattern: /\binvestimento sem risco\b/i, reason: 'frase proibida: "investimento sem risco"' },
  { pattern: /\bvai dobrar seu dinheiro\b/i, reason: 'frase proibida: promessa de dobrar dinheiro' },
  { pattern: /\bganhar dinheiro f[áa]cil\b/i, reason: 'frase proibida: "ganhar dinheiro fácil"' },
  { pattern: /\bday\s?trade\b/i, reason: 'tema fora do escopo: day trade' },
  { pattern: /\bcriptomoedas?\b.*\b(comprar|investir|recomendo)\b/i, reason: 'recomendação direta de cripto (fora de escopo)' },
  { pattern: /\bmlm\b|\bmarketing multin[íi]vel\b/i, reason: 'tema fora do escopo: marketing multinível' },
  { pattern: /\bpir[âa]mide\b/i, reason: 'tema fora do escopo: esquema piramidal' },
];

export const OUT_OF_SCOPE_TOPICS: { pattern: RegExp; reason: string }[] = [
  { pattern: /\bday\s?trade\b/i, reason: 'day trade fora do escopo do MeuCaixa' },
  { pattern: /\b(comprar|recomendo|melhor)\s+a[çc][ãa]o\s+(da|de)\b/i, reason: 'recomendação de ação específica' },
  { pattern: /\b(bitcoin|ethereum|altcoin)\b.*\b(comprar|investir|ganhar)\b/i, reason: 'recomendação especulativa em cripto' },
];

export function detectForbiddenPhrases(text: string): { reason: string; match: string }[] {
  const findings: { reason: string; match: string }[] = [];
  for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
    const m = text.match(pattern);
    if (m) findings.push({ reason, match: m[0] });
  }
  for (const { pattern, reason } of OUT_OF_SCOPE_TOPICS) {
    const m = text.match(pattern);
    if (m) findings.push({ reason, match: m[0] });
  }
  return findings;
}

export function isInScope(topic: string): { ok: boolean; reason?: string } {
  for (const { pattern, reason } of OUT_OF_SCOPE_TOPICS) {
    if (pattern.test(topic)) return { ok: false, reason };
  }
  return { ok: true };
}
