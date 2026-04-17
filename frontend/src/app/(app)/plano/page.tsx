'use client';

import { useState } from 'react';
import { Check, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useSubscription,
  useCancelSubscription,
  useCheckoutUrl,
  CpfCnpjRequiredError,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/shared/page-header';

function formatCpfCnpj(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function statusLabel(status: string, blocked: boolean, trialActive: boolean) {
  if (status === 'LIFETIME')
    return { label: 'Vitalício', color: 'text-purple-400' };
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
  const cancel = useCancelSubscription();
  const checkout = useCheckoutUrl();
  const [openingPlan, setOpeningPlan] = useState<SubscriptionPlan | null>(null);
  const [cpfCnpjModal, setCpfCnpjModal] = useState<{
    plan: 'MONTHLY' | 'ANNUAL';
  } | null>(null);
  const [cpfCnpjInput, setCpfCnpjInput] = useState('');

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

  // Plano vitalício: sem cobrança, sem ações de pagamento
  if (sub.lifetime) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title="Meu Plano"
          subtitle="Sua assinatura Meu Caixa"
          helpTitle="Acesso vitalício"
          helpBody={
            <p>
              Você tem acesso completo ao Meu Caixa, liberado permanentemente,
              sem cobrança recorrente. Todos os recursos (despesas, receitas,
              relatórios, WhatsApp bot) estão disponíveis.
            </p>
          }
        />
        <Card className="border-purple-500/30 bg-purple-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-purple-400">★</span>
              Acesso Vitalício
            </CardTitle>
            <CardDescription>
              Você tem acesso completo ao Meu Caixa, sem cobrança recorrente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Todos os recursos liberados. Nenhuma ação necessária.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const doCheckout = async (
    plan: 'MONTHLY' | 'ANNUAL',
    cpfCnpj?: string,
  ) => {
    setOpeningPlan(plan);
    try {
      const url = await checkout.mutateAsync({ plan, cpfCnpj });
      if (url) {
        window.open(url, '_blank');
        setCpfCnpjModal(null);
        setCpfCnpjInput('');
      } else {
        toast.error(
          'Link de pagamento ainda não disponível. Aguarde alguns segundos e tente de novo.',
        );
      }
    } catch (err) {
      if (err instanceof CpfCnpjRequiredError) {
        setCpfCnpjModal({ plan });
      }
    } finally {
      setOpeningPlan(null);
    }
  };

  const handlePay = (plan: 'MONTHLY' | 'ANNUAL') => doCheckout(plan);

  const handleSubmitCpfCnpj = () => {
    if (!cpfCnpjModal) return;
    const digits = cpfCnpjInput.replace(/\D/g, '');
    if (digits.length !== 11 && digits.length !== 14) {
      toast.error('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.');
      return;
    }
    void doCheckout(cpfCnpjModal.plan, digits);
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
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Meu Plano"
        subtitle="Gerencie sua assinatura do Meu Caixa"
        helpTitle="Como funciona a assinatura?"
        helpBody={
          <>
            <p>
              O Meu Caixa trabalha com <strong>assinatura recorrente</strong>.
              Você tem 3 dias grátis pra testar, e depois continua com o
              plano Mensal (R$ 19,90/mês) ou Anual (R$ 199,90/ano — economiza
              ~16%).
            </p>
            <p className="pt-1">
              <strong>Como pagar</strong>: clique em <em>Pagar mensal</em>{' '}
              ou <em>Pagar anual</em> no card do plano que você quer — você é
              levado direto pro checkout seguro do Asaas, onde paga com cartão
              de crédito ou Pix. O pagamento cai na hora e libera seu acesso
              automaticamente.
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
          {sub.trialing && sub.trialActive && sub.trialEndsAt && (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
              🎁 <strong>{sub.trialDaysLeft} dia{sub.trialDaysLeft !== 1 ? 's' : ''}</strong>{' '}
              de período gratuito restante. Termina em{' '}
              {new Date(sub.trialEndsAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.
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
              {new Date(sub.currentPeriodEnd).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
            </p>
          )}

          {sub.status !== 'CANCELED' && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" onClick={handleCancel} disabled={cancel.isPending}>
                Cancelar assinatura
              </Button>
            </div>
          )}
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
            <Button
              variant={sub.plan === 'MONTHLY' ? 'default' : 'outline'}
              className="w-full"
              onClick={() => handlePay('MONTHLY')}
              disabled={openingPlan !== null}
            >
              {openingPlan === 'MONTHLY' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Pagar mensal
            </Button>
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
            <Button
              variant={sub.plan === 'ANNUAL' ? 'default' : 'outline'}
              className="w-full"
              onClick={() => handlePay('ANNUAL')}
              disabled={openingPlan !== null}
            >
              {openingPlan === 'ANNUAL' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Pagar anual (economizar)
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={cpfCnpjModal !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCpfCnpjModal(null);
            setCpfCnpjInput('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>CPF ou CNPJ pra emitir a cobrança</DialogTitle>
            <DialogDescription>
              O Asaas (gateway de pagamento) exige o CPF ou CNPJ pra emitir
              o boleto/cartão. A gente guarda só pra isso, não aparece em
              nenhum outro lugar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="cpfCnpj">CPF ou CNPJ</Label>
            <Input
              id="cpfCnpj"
              autoFocus
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              value={cpfCnpjInput}
              onChange={(e) => setCpfCnpjInput(formatCpfCnpj(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmitCpfCnpj();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCpfCnpjModal(null);
                setCpfCnpjInput('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitCpfCnpj}
              disabled={openingPlan !== null}
            >
              {openingPlan ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Continuar pro pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
