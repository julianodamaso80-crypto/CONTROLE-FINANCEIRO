/**
 * SHA-256 hashing pra PII (email, phone).
 * Necessário pra Meta CAPI e Google Ads Enhanced Conversions:
 * - email: lowercase + trim + sha256
 * - phone: só dígitos + E.164 sem '+' + sha256
 */

export async function sha256(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashEmail(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  return sha256(normalized);
}

export async function hashPhone(phoneE164OrDigits: string): Promise<string> {
  // remove tudo que não é dígito; se começar com 0 (DDI faltando), assume Brasil 55
  let digits = phoneE164OrDigits.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return sha256(digits);
}
