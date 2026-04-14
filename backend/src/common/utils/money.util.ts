import { Decimal } from 'decimal.js';

/**
 * Converte Decimal do Prisma (ou number/string) para number com 2 casas decimais.
 */
export function toMoney(
  value: Decimal | number | string | null | undefined,
): number {
  if (value === null || value === undefined) return 0;
  return Number(new Decimal(value.toString()).toFixed(2));
}

/**
 * Subtrai b de a com precisão decimal. Retorna number com 2 casas.
 */
export function subtractMoney(
  a: Decimal | number | string,
  b: Decimal | number | string,
): number {
  return Number(
    new Decimal(a.toString()).minus(new Decimal(b.toString())).toFixed(2),
  );
}
