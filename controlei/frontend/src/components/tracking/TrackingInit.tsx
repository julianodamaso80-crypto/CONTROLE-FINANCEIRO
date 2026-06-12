"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { captureClickIds, captureUtms, captureLanding, trackEvent } from "@/lib/tracking";

/**
 * Inicializa o tracking no primeiro mount + dispara page_view em mudanças de rota.
 * Deve ser montado uma vez no <body> do RootLayout (dentro dos providers).
 */
export function TrackingInit() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // captura inicial — uma vez por sessão
  useEffect(() => {
    captureClickIds();
    captureUtms();
    captureLanding();
  }, []);

  // dispara page_view em mudança de rota (App Router não recarrega)
  useEffect(() => {
    if (typeof window === "undefined") return;
    // pequeno delay pra dataLayer já estar disponível (GTM Stape async)
    const t = setTimeout(() => {
      trackEvent("page_view", {}, { clientOnly: true });
    }, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams?.toString()]);

  return null;
}
