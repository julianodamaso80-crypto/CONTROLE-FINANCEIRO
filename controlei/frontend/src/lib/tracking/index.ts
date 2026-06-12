/**
 * Controlei — Biblioteca de tracking client-side.
 *
 * Responsabilidades:
 * 1. Capturar gclid/fbclid/gbraid/wbraid/msclkid no 1º pageview e persistir em cookie 90d
 * 2. Capturar UTMs e persistir
 * 3. Disparar eventos no dataLayer (consumidos pelo GTM Web GTM-NG5RG625)
 * 4. Disparar mesmo evento no backend (/api/track) com event_id pra dedup CAPI
 *
 * Padrão do 21Go adaptado: dual-fire (client + server) com mesmo UUID em event_id.
 */

import { getCookie, setCookie, setJSON, getJSON } from "./cookies";

// ============================================================
// Tipagem
// ============================================================
export type ClickIds = {
  gclid?: string;
  fbclid?: string;
  gbraid?: string;
  wbraid?: string;
  msclkid?: string;
  ttclid?: string;
};

export type Utms = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
};

export type EventName =
  | "page_view"
  | "lead_signup"
  | "trial_started"
  | "checkout_initiated"
  | "subscribe"
  | "subscription_renewed"
  | "first_transaction"
  | "whatsapp_click";

export type EventParams = {
  value?: number;
  currency?: string;
  transaction_id?: string;
  plan_type?: "MONTHLY" | "ANNUAL" | string;
  email_hash?: string;
  phone_hash?: string;
  user_id?: string;
  external_id?: string;
  [k: string]: unknown;
};

// ============================================================
// Constants
// ============================================================
const COOKIE_CLICK_IDS = "_mc_click_ids";
const COOKIE_UTMS = "_mc_utms";
const COOKIE_LANDING = "_mc_landing";
const COOKIE_FIRST_SEEN = "_mc_first_seen";
const TRACK_ENDPOINT = "/api/track"; // backend NestJS dispatcher

const CLICK_PARAMS: (keyof ClickIds)[] = [
  "gclid",
  "fbclid",
  "gbraid",
  "wbraid",
  "msclkid",
  "ttclid",
];
const UTM_PARAMS: (keyof Utms)[] = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
];

// ============================================================
// Capture (chamado uma vez por sessão, no TrackingInit)
// ============================================================
export function captureClickIds(): ClickIds {
  if (typeof window === "undefined") return {};
  const url = new URL(window.location.href);
  const stored = getJSON<ClickIds>(COOKIE_CLICK_IDS) || {};
  const updated: ClickIds = { ...stored };

  for (const key of CLICK_PARAMS) {
    const fromUrl = url.searchParams.get(key);
    if (fromUrl) updated[key] = fromUrl;
  }

  if (Object.keys(updated).length > 0) {
    setJSON(COOKIE_CLICK_IDS, updated);
  }
  return updated;
}

export function captureUtms(): Utms {
  if (typeof window === "undefined") return {};
  const url = new URL(window.location.href);
  const stored = getJSON<Utms>(COOKIE_UTMS) || {};

  // Se a URL atual tem qualquer UTM, sobrescreve TUDO (nova campanha = nova fonte)
  const incoming: Utms = {};
  for (const key of UTM_PARAMS) {
    const v = url.searchParams.get(key);
    if (v) incoming[key] = v;
  }

  if (Object.keys(incoming).length > 0) {
    setJSON(COOKIE_UTMS, incoming);
    return incoming;
  }
  return stored;
}

export function captureLanding(): void {
  if (typeof window === "undefined") return;
  if (!getCookie(COOKIE_FIRST_SEEN)) {
    setCookie(COOKIE_FIRST_SEEN, new Date().toISOString());
    setCookie(COOKIE_LANDING, window.location.href);
  }
}

// ============================================================
// Getters (read-only)
// ============================================================
export function getStoredClickIds(): ClickIds {
  return getJSON<ClickIds>(COOKIE_CLICK_IDS) || {};
}

export function getStoredUtms(): Utms {
  return getJSON<Utms>(COOKIE_UTMS) || {};
}

export function getFbp(): string | null {
  return getCookie("_fbp");
}

export function getFbc(): string | null {
  // se _fbc já existe usa, senão monta a partir do fbclid armazenado
  const fbc = getCookie("_fbc");
  if (fbc) return fbc;
  const { fbclid } = getStoredClickIds();
  if (!fbclid) return null;
  // formato oficial Meta: fb.<subdomainIndex>.<creationTime>.<fbclid>
  return `fb.1.${Date.now()}.${fbclid}`;
}

export function getGaClientId(): string | null {
  const ga = getCookie("_ga");
  if (!ga) return null;
  // _ga formato: GA1.2.<client_id> ou GA1.1.<client_id>
  const parts = ga.split(".");
  return parts.length >= 4 ? `${parts[2]}.${parts[3]}` : null;
}

// ============================================================
// Event ID (UUID por evento, usado pra dedup client+server)
// ============================================================
export function newEventId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ============================================================
// Dispatch: dataLayer (client) + backend (/api/track)
// ============================================================

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export type TrackOptions = {
  /** Se true, NÃO envia pro backend (só dataLayer). Útil pra eventos que o backend já loga sozinho (ex: subscribe via webhook). */
  clientOnly?: boolean;
};

export function trackEvent(
  eventName: EventName,
  params: EventParams = {},
  options: TrackOptions = {},
): string {
  const event_id = (params.transaction_id as string) || newEventId();
  const click_ids = getStoredClickIds();
  const utms = getStoredUtms();
  const fbp = getFbp();
  const fbc = getFbc();
  const ga_client_id = getGaClientId();

  const payload = {
    event_id,
    event_name: eventName,
    timestamp: new Date().toISOString(),
    page_url: typeof window !== "undefined" ? window.location.href : undefined,
    page_referrer:
      typeof document !== "undefined" ? document.referrer : undefined,
    ...params,
    ...click_ids,
    ...utms,
    fbp,
    fbc,
    ga_client_id,
  };

  // 1) dataLayer → GTM Web (GA4 + Meta Pixel + Google Ads)
  if (typeof window !== "undefined") {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      ...payload,
    });
  }

  // 2) Backend dispatch (Meta CAPI server-side + GA4 MP + auditoria)
  if (!options.clientOnly && typeof window !== "undefined") {
    fetch(TRACK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
      keepalive: true, // sobrevive à navegação se o usuário clica e sai
    }).catch(() => {
      // tracking nunca pode quebrar UX — silencia falha
    });
  }

  return event_id;
}

// ============================================================
// Atalhos de conveniência
// ============================================================
export const trackLeadSignup = (params: EventParams = {}) =>
  trackEvent("lead_signup", params);

export const trackTrialStarted = (params: EventParams = {}) =>
  trackEvent("trial_started", params);

export const trackCheckoutInitiated = (params: EventParams = {}) =>
  trackEvent("checkout_initiated", params);

export const trackFirstTransaction = (params: EventParams = {}) =>
  trackEvent("first_transaction", params);

export const trackWhatsAppClick = (params: EventParams = {}) =>
  trackEvent("whatsapp_click", params);
