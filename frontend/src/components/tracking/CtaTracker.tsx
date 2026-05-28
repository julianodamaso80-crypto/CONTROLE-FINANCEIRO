"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/tracking";

/**
 * Intercepta cliques em CTAs principais da landing (`/register`, `/login`, `/#planos`)
 * globalmente. Não dispara eventos do funil (lead_signup, etc) — só GA4 cta_click
 * pra medir "quantos cliques chegaram até cada CTA".
 *
 * Não interfere em navegação. Dedup 1.5s.
 *
 * Pra desligar num CTA específico: data-track-skip="true"
 */

const CTA_ROUTES = ["/register", "/login", "/plano", "/#planos"];

function matchCta(href: string): boolean {
  try {
    const url = new URL(href, window.location.origin);
    const path = url.pathname + url.hash;
    return CTA_ROUTES.some(
      (route) => path === route || path.startsWith(route + "?") || path.startsWith(route + "/"),
    );
  } catch {
    return false;
  }
}

function inferOrigin(el: HTMLElement): string {
  // tenta atributo explícito primeiro
  const explicit = el.closest("[data-track-origin]") as HTMLElement | null;
  if (explicit?.dataset.trackOrigin) return explicit.dataset.trackOrigin;

  // depois inspeciona o ancestral semântico
  const inHeader = el.closest("header");
  if (inHeader) return "header";
  const inFooter = el.closest("footer");
  if (inFooter) return "footer";
  const inNav = el.closest("nav");
  if (inNav) return "nav";
  const inHero = el.closest("[data-section='hero']");
  if (inHero) return "hero";
  return "body";
}

export function CtaTracker() {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.dataset.trackSkip === "true") return;
      if (anchor.dataset.mcCtaTracked === "true") return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      if (!matchCta(href)) return;

      anchor.dataset.mcCtaTracked = "true";
      setTimeout(() => {
        delete anchor.dataset.mcCtaTracked;
      }, 1500);

      try {
        trackEvent(
          "page_view", // GA4 não tem evento cta_click standard; usamos custom param em page_view com track_type
          {
            track_type: "cta_click",
            cta_destination: href,
            cta_origin: inferOrigin(anchor),
            cta_text: anchor.textContent?.trim().slice(0, 80) || "",
          },
          { clientOnly: true },
        );
      } catch {}
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

  return null;
}
