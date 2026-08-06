import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
}

/**
 * Formata uma data de calendário (vencimento, competência, pagamento).
 *
 * O backend guarda esses campos em colunas DATE e os serializa como
 * "2026-08-06T00:00:00.000Z" — meia-noite UTC. Renderizar isso em
 * America/Sao_Paulo (UTC-3) voltaria um dia. Por isso lê-se em UTC.
 * Para instantes reais (createdAt, pagamentos), use formatDateTime.
 */
export function formatDate(
  date: string | Date,
  pattern: 'short' | 'long' = 'short',
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (pattern === 'short') {
    return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function formatDateInput(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
