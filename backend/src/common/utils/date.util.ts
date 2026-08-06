const SP_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Data civil de hoje em São Paulo no formato YYYY-MM-DD.
 */
export function todaySP(): string {
  return SP_DATE_FORMATTER.format(new Date());
}

/**
 * Normaliza um valor que JÁ representa um dia do calendário para meia-noite UTC —
 * o formato que as colunas `@db.Date` do Prisma esperam.
 *
 * Cobre "2026-08-06", "2026-08-06T00:00:00.000Z" e Dates construídos em UTC
 * (parser OFX). Sempre lê os componentes em UTC: interpretar em São Paulo
 * voltaria um dia.
 *
 * NÃO use com `new Date()` nem com instantes reais — para "hoje", use
 * todayCalendarDate().
 */
export function toCalendarDate(value: string | Date): Date {
  if (typeof value === 'string') {
    const dateOnly = /^\d{4}-\d{2}-\d{2}/.exec(value);
    if (dateOnly) return new Date(`${dateOnly[0]}T00:00:00.000Z`);
  }

  const parsed = typeof value === 'string' ? new Date(value) : value;
  return new Date(
    Date.UTC(
      parsed.getUTCFullYear(),
      parsed.getUTCMonth(),
      parsed.getUTCDate(),
    ),
  );
}

/**
 * Hoje (dia civil de São Paulo) como data pura pronta para gravar.
 */
export function todayCalendarDate(): Date {
  return new Date(`${todaySP()}T00:00:00.000Z`);
}
