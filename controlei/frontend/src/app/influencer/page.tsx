'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Loader2,
  Copy,
  Check,
  Wallet,
  Clock,
  Users as UsersIcon,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface DashboardData {
  profile: {
    name: string;
    email: string;
    refCode: string;
    saleCommissionPct: number;
    recurringCommissionPct: number;
    pixKey: string | null;
    isActive: boolean;
  };
  totals: {
    referrals: number;
    salesCount: number;
    pendingCommission: number;
    paidCommission: number;
    totalCommission: number;
  };
  referrals: Array<{
    companyName: string;
    status: string;
    createdAt: string;
  }>;
  commissions: Array<{
    id: string;
    companyName: string;
    type: 'SALE' | 'RECURRING';
    amount: number;
    percentage: number;
    status: 'PENDING' | 'PAID' | 'CANCELED';
    description: string | null;
    createdAt: string;
  }>;
}

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
  });
}

const STATUS: Record<
  'PENDING' | 'PAID' | 'CANCELED',
  { label: string; cls: string }
> = {
  PENDING: {
    label: 'Pendente',
    cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  PAID: {
    label: 'Paga',
    cls: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  CANCELED: {
    label: 'Cancelada',
    cls: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  },
};

export default function InfluencerDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [refLink, setRefLink] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/influencer/dashboard');
      const payload: DashboardData = res.data.data ?? res.data;
      setData(payload);
      if (typeof window !== 'undefined') {
        setRefLink(
          `${window.location.origin}/register?ref=${payload.profile.refCode}`,
        );
      }
    } catch {
      toast.error('Erro ao carregar seu painel');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(refLink);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não consegui copiar — copie manualmente');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Não foi possível carregar seu painel.
      </div>
    );
  }

  const { profile, totals, referrals, commissions } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Olá, {profile.name.split(' ')[0]} 👋</h1>
        <p className="text-sm text-muted-foreground">
          Comissão de {profile.saleCommissionPct}% por venda e{' '}
          {profile.recurringCommissionPct}% nas renovações.
        </p>
      </div>

      {/* Link de indicação */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Seu link de indicação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={refLink}
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground focus:outline-none"
            />
            <Button onClick={copyLink} className="gap-2">
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? 'Copiado' : 'Copiar link'}
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Quem se cadastrar por esse link e virar pagante gera comissão pra você.
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              A receber
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">
              {fmtBRL(totals.pendingCommission)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Já recebido
            </CardTitle>
            <Wallet className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fmtBRL(totals.paidCommission)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Indicados
            </CardTitle>
            <UsersIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.referrals}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vendas
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-pink-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.salesCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Comissões */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Minhas comissões</h2>
        <Card>
          <CardContent className="p-0">
            {commissions.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Ainda sem comissões. Divulgue seu link! 🚀
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-medium uppercase text-muted-foreground">
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Valor</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {commissions.map((c) => {
                      const badge = STATUS[c.status];
                      return (
                        <tr key={c.id} className="hover:bg-accent/50">
                          <td className="px-4 py-3">{c.companyName}</td>
                          <td className="px-4 py-3 text-xs">
                            {c.type === 'SALE' ? 'Venda' : 'Recorrência'}
                            <span className="ml-1 text-muted-foreground">
                              ({c.percentage}%)
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {fmtBRL(c.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.cls}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {formatDate(c.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Indicados */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Meus indicados</h2>
        <Card>
          <CardContent className="p-0">
            {referrals.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhum indicado ainda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-medium uppercase text-muted-foreground">
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Plano</th>
                      <th className="px-4 py-3">Desde</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {referrals.map((r, i) => (
                      <tr key={i} className="hover:bg-accent/50">
                        <td className="px-4 py-3">{r.companyName}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {r.status}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDate(r.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
