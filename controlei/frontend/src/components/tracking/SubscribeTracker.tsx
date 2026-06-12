"use client";

import { useEffect, useRef } from "react";
import { useSubscription } from "@/hooks/use-subscription";
import { trackEvent } from "@/lib/tracking";

/**
 * Detecta quando a subscription do user vira ACTIVE (após pagamento Kirvano/Asaas
 * confirmado pelo webhook) e dispara o evento `subscribe` UMA vez.
 *
 * Dedup:
 *  - localStorage `_mc_last_subscribe_id` guarda o ID da subscription que já foi rastreada
 *  - Se a query re-fetcha e mostra mesma sub ACTIVE, NÃO dispara de novo
 *  - Mesma transaction_id é usada como event_id → Meta CAPI deduplica com o webhook backend
 *
 * Plugar no layout do (app) (já dentro do AuthProvider).
 */
const LS_KEY = "_mc_last_subscribe_id";

export function SubscribeTracker() {
  const { data: sub } = useSubscription();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    if (typeof window === "undefined") return;
    if (!sub) return;
    if (sub.status !== "ACTIVE") return;
    if (!sub.id) return;

    let lastTracked: string | null = null;
    try {
      lastTracked = localStorage.getItem(LS_KEY);
    } catch {
      // ignora erro de storage (modo privado iOS)
    }
    if (lastTracked === sub.id) return;

    const value = sub.planValues?.[sub.plan as "MONTHLY" | "ANNUAL"] ??
      (sub.plan === "ANNUAL" ? 199 : 19.9);

    try {
      trackEvent("subscribe", {
        transaction_id: sub.id,
        value,
        currency: "BRL",
        plan_type: sub.plan,
      });
      localStorage.setItem(LS_KEY, sub.id);
      handled.current = true;
    } catch {
      // tracking nunca pode quebrar UX
    }
  }, [sub?.id, sub?.status]);

  return null;
}
