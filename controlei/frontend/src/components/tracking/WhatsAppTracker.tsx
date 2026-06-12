"use client";

import { useEffect } from "react";
import { trackWhatsAppClick } from "@/lib/tracking";

/**
 * Intercepta cliques em links WhatsApp (wa.me, api.whatsapp.com, whatsapp:)
 * globalmente e dispara `whatsapp_click`.
 *
 * Padrão de delegation em document (capture phase) — roda antes de handlers locais.
 * Dedup leve por marker `data-mc-tracked` pra não disparar 2x se o componente
 * tiver onClick próprio.
 *
 * Pra desligar em um link específico: <a data-track-skip="true" href="wa.me/...">
 */
export function WhatsAppTracker() {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.dataset.trackSkip === "true") return;
      if (anchor.dataset.mcTracked === "true") return;

      const href = anchor.href || "";
      const isWhatsApp =
        href.includes("wa.me/") ||
        href.includes("api.whatsapp.com") ||
        href.startsWith("whatsapp:");

      if (!isWhatsApp) return;

      // marca pra evitar dupla disparada
      anchor.dataset.mcTracked = "true";
      setTimeout(() => {
        delete anchor.dataset.mcTracked;
      }, 1500);

      const origin =
        anchor.dataset.trackOrigin ||
        anchor.getAttribute("aria-label") ||
        anchor.textContent?.trim().slice(0, 50) ||
        "unknown";

      try {
        trackWhatsAppClick({
          click_origin: origin,
          click_url: href,
          page_path:
            typeof window !== "undefined" ? window.location.pathname : "",
        });
      } catch {
        // tracking nunca pode bloquear navegação
      }
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

  return null;
}
