'use client';

import { useState } from 'react';
import { Check, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useSubscription,
  useChangePlan,
  useCancelSubscription,
  useRefreshPaymentUrl,
  type SubscriptionPlan,
} from '@/hooks/use-subscription';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function statusLabel(status: string, blocked: boolean, trialActive: boolean) {
  if (status === 'ACTIVE') return { label: 'Ativo', color: 'text-green-500' };
  if (trialActive)
    return { label: 'Período gratuito', color: 'text-emerald-400' };
  if (blocked) return { label: 'Bloqueado', color: 'text-destructive' };
  if (status === 'PAST_DUE')
    return { label: 'Pagamento pendente', color: 'text-amber-400' };
  if (status === 'CANCELED')
    return { label: 'Cancelado', color: 'text-muted-foreground' };
  if (status === 'EXPIRED')
    return { label: 'Expirado', color: 'text-destructive' };
  return { label: status, color: 'text-muted-foreground' };
}

export default function PlanoPage() {
  const { data: sub, isLoading } = useSubscription();
  const changePlan = useChangePlan();
  const cancel = useCancelSubscription();
  const refresh = useRefreshPaymentUrl();
  const [openingPayment, setOpeningPayment] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Nenhuma assinatura encontrada</CardTitle>
            <CardDescription>
              Entre em contato com o suporte.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const status = statusLabel(sub.status, sub.blocked, sub.trialActive);
  const monthlyValue = sub.planValues.MONTHLY;
  const annualValue = sub.planValues.ANNUAL;
  const annualMonthly = annualValue / 12;
  const annualSavePct = Math.round((1 - annualMonthly / monthlyValue) * 100);

  const openPayment = async () => {
    setOpeningPayment(true);
    try {
      let url = sub.paymentUrl;
      if (!url) {
        url = await refresh.mutateAsync();
      }
      if (url) {
        window.open(url, '_blank');
      } else {
        toast.error('Link de pagamento indisponível. Tente novamente em alguns segundos.');
      }
    } finally {
      setOpeningPayment(false);
    }
  };

  const handleChangePlan = async (plan: SubscriptionPlan) => {
    if (plan === sub.plan) return;
    if (
      !confirm(
        `Mudar para o plano ${plan === 'MONTHLY' ? 'Mensal' : 'Anual'}?`,
      )
    )
      return;
    await changePlan.mutateAsync(plan);
  };

  const handleCancel = async () => {
    if (
      !confirm(
        'Cancelar sua assinatura? Você perde o acesso no fim do período atual.',
      )
    )
      return;
    await cancel.mutateAsync();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <PageHeader
        title="Meu Plano"
        subtitle="Gerencie sua assinatura do Meu Caixa"
        helpTitle="Como funciona a assinatura?"
        helpBody={
          <>
            <p>
              O Meu Caixa trabalha com <strong>assinatura recorrente</strong>.
              Você tem 1 dia grátis pra testar, e depois continua com o
              plano Mensal (R$ 19,90/mês) ou Anual (R$ 199,90/ano — economiza
              ~16%).
            </p>
            <p className="pt-1">
              <strong>Como pagar</strong>: clique em{' '}
              <em>Pagar agora</em> — você é levado pro checkout seguro do
              Asaas onde pode pagar com cartão de crédito ou Pix. O
              pagamento cai na hora e libera seu acesso automaticamente.
            </p>
            <p>
              <strong>Cobrança recorrente</strong>: depois do primeiro
              pagamento, as próximas cobranças são feitas automaticamente
              no mesmo dia de cada mês (ou ano). Você recebe notificação
              antes.
            </p>
            <p>
              <strong>Trocar de plano</strong>: dá pra mudar de mensal pra
              anual (ou o contrário) a qualquer momento nos cards abaixo.
              A diferença entra na próxima cobrança.
            </p>
            <p>
              <strong>Cancelar</strong>: você pode cancelar quando quiser —
              mantém o acesso até o fim do período que já pagou, depois
              para.
            </p>
            <p className="pt-1">
              ⚠️ <strong>Atenção</strong>: se o pagamento falhar ou atrasar,
              seu acesso ao painel e ao bot do WhatsApp é{' '}
              <strong>bloqueado automaticamente</strong> até regularizar.
            </p>
          </>
        }
      />

      {/* Status card */}
      <Card>
        <CardHeader>
          <CardTitle>Status atual</CardTitle>
          <CardDescription>
            Plano {sub.plan === 'MONTHLY' ? 'Mensal' : 'Anual'} —{' '}
            <span className={status.color}>{status.label}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sub.trialing && sub.trialActive && (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
              🎁 <strong>{sub.trialDaysLeft} dia{sub.trialDaysLeft !== 1 ? 's' : ''}</strong>{' '}
              de período gratuito restante. Termina em{' '}
              {new Date(sub.trialEndsAt).toLocaleString('pt-BR')}.
            </div>
          )}

          {sub.blocked && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
              ⚠️ Seu acesso está suspenso. Renove o pagamento abaixo pra
              voltar a usar o Meu Caixa.
            </div>
          )}

          {sub.currentPeriodEnd && !sub.blocked && sub.status === 'ACTIVE' && (
            <p className="text-sm text-muted-foreground">
              Próxima cobrança em{' '}
              {new Date(sub.currentPeriodEnd).toLocaleDateString('pt-BR')}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={openPayment} disabled={openingPayment}>
              {openingPayment ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Pagar agora
            </Button>
            {sub.status !== 'CANCELED' && (
              <Button variant="outline" onClick={handleCancel} disabled={cancel.isPending}>
                Cancelar assinatura
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Planos */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card
          className={
            sub.plan === 'MONTHLY' ? 'border-primary bg-primary/5' : ''
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Mensal
              {sub.plan === 'MONTHLY' && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  Atual
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-2xl font-semibold text-foreground">
              {fmtBRL(monthlyValue)}
              <span className="text-sm font-normal text-muted-foreground">
                {' '}/mês
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <Feature text="Despesas e receitas ilimitadas" />
              <Feature text="Registro por WhatsApp (texto, áudio e foto)" />
              <Feature text="Relatórios e análises" />
              <Feature text="Cancele quando quiser" />
            </ul>
            {sub.plan !== 'MONTHLY' && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleChangePlan('MONTHLY')}
                disabled={changePlan.isPending}
              >
                Mudar para mensal
              </Button>
            )}
          </CardContent>
        </Card>

        <Card
          className={
            sub.plan === 'ANNUAL' ? 'border-primary bg-primary/5' : ''
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Anual
              <div className="flex items-center gap-2">
                {sub.plan === 'ANNUAL' && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    Atual
                  </span>
                )}
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
                  -{annualSavePct}%
                </span>
              </div>
            </CardTitle>
            <CardDescription className="text-2xl font-semibold text-foreground">
              {fmtBRL(annualValue)}
              <span className="text-sm font-normal text-muted-foreground">
                {' '}/ano
              </span>
              <div className="text-xs font-normal text-muted-foreground">
                equivalente a {fmtBRL(annualMonthly)}/mês
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <Feature text="Tudo do plano mensal" />
              <Feature text={`Economize ${annualSavePct}% no ano`} />
              <Feature text="Um pagamento só" />
              <Feature text="Cancele quando quiser" />
            </ul>
            {sub.plan !== 'ANNUAL' && (
              <Button
                className="w-full"
                onClick={() => handleChangePlan('ANNUAL')}
                disabled={changePlan.isPending}
              >
                Mudar para anual (economizar)
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>{text}</span>
    </li>
  );
}
