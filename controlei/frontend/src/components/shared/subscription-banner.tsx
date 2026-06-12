'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSubscription } from '@/hooks/use-subscription';

export function SubscriptionBanner() {
  const { data: sub } = useSubscription();
  const pathname = usePathname();

  // Não mostra na própria página de plano
  if (pathname === '/plano') return null;
  if (!sub) return null;

  // Bloqueado: banner vermelho
  if (sub.blocked) {
    return (
      <div className="border-b border-destructive/40 bg-destructive/15 px-6 py-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            🔒 <strong>Acesso suspenso.</strong> Renove sua assinatura pra
            continuar usando.
          </div>
          <Link
            href="/plano"
            className="rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:opacity-90"
          >
            Renovar agora
          </Link>
        </div>
      </div>
    );
  }

  // Trial ativo: banner verde
  if (sub.trialing && sub.trialActive) {
    return (
      <div className="border-b border-emerald-500/30 bg-emerald-500/10 px-6 py-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            🎁 Você tem <strong>{sub.trialDaysLeft} dia{sub.trialDaysLeft !== 1 ? 's' : ''}</strong>{' '}
            de teste grátis. Depois disso, seu acesso será pausado até o pagamento.
          </div>
          <Link
            href="/plano"
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            Ver planos
          </Link>
        </div>
      </div>
    );
  }

  // PAST_DUE: banner amarelo
  if (sub.status === 'PAST_DUE') {
    return (
      <div className="border-b border-amber-500/40 bg-amber-500/15 px-6 py-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            ⚠️ <strong>Pagamento pendente.</strong> Regularize pra não perder
            o acesso.
          </div>
          <Link
            href="/plano"
            className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            Pagar agora
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
