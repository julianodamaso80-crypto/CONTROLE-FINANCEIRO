/**
 * Helpers pra cookies first-party (.controlei.ia.br) e localStorage.
 * Usado pra persistir UTMs e click IDs (gclid/fbclid/gbraid/wbraid/msclkid)
 * por 90 dias no domínio raiz, sobrevivendo a navegação cross-subdomain.
 */

const COOKIE_DOMAIN = ".controlei.ia.br";
const COOKIE_DAYS = 90;

export function setCookie(name: string, value: string, days = COOKIE_DAYS) {
  if (typeof document === "undefined") return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  // só seta domain= em produção (com TLD); em localhost deixa sem domain
  const domainPart =
    host.endsWith("controlei.ia.br") ? `; domain=${COOKIE_DOMAIN}` : "";
  document.cookie = `${name}=${encodeURIComponent(
    value,
  )}; expires=${expires.toUTCString()}; path=/${domainPart}; SameSite=Lax`;
}

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  if (!match) return null;
  const idx = match.indexOf("=");
  return decodeURIComponent(match.slice(idx + 1));
}

export function setJSON<T>(name: string, value: T, days = COOKIE_DAYS) {
  setCookie(name, JSON.stringify(value), days);
  try {
    localStorage.setItem(name, JSON.stringify(value));
  } catch {
    // localStorage pode estar bloqueado (modo privado iOS) — ignora
  }
}

export function getJSON<T>(name: string): T | null {
  const fromCookie = getCookie(name);
  if (fromCookie) {
    try {
      return JSON.parse(fromCookie) as T;
    } catch {}
  }
  try {
    const fromLS = localStorage.getItem(name);
    return fromLS ? (JSON.parse(fromLS) as T) : null;
  } catch {
    return null;
  }
}
