'use client';

import { useEffect, useState } from 'react';
import {
  Building2,
  Users,
  ArrowLeftRight,
  TrendingUp,
  Clock,
  CreditCard,
  CalendarCheck,
  Infinity,
  AlertTriangle,
  Brain,
} from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ApiResponse } from '@/types/api';

interface AdminOverview {
  totals: {
    companies: number;
    users: number;
    transactions: number;
    totalIncome: string;
    totalExpense: string;
  };
  llmCost: {
    totalUsd: number;
    totalBrl: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
  };
  subscriptionStats: {
    trialing: number;
    active: number;
    pastDue: number;
    canceled: number;
    lifetime: number;
    monthly: number;
    annual: number;
  };
  recentCompanies: Array<{
    id: string;
    name: string;
    email: string;
    plan: string;
    createdAt: string;
    _count: { users: number; transactions: number };
  }>;
}

function formatCurrency(value: string): string {
  const n = Number(value);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('pt-BR');
}

function planBadge(plan: string) {
  switch (plan) {
    case 'BUSINESS':
      return 'bg-purple-500/20 text-purple-400';
    case 'PRO':
      return 'bg-blue-500/20 text-blue-400';
    case 'STARTER':
      return 'bg-green-500/20 text-green-400';
    default:
      return 'bg-zinc-500/20 text-zinc-400';
  }
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<ApiResponse<AdminOverview>>('/admin/overview')
      .then((res) => setData(res.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-muted-foreground">
        Não foi possível carregar os dados do admin.
      </div>
    );
  }

  const mainCards = [
    {
      label: 'Empresas',
      value: data.totals.companies.toString(),
      icon: Building2,
    },
    {
      label: 'Usuários',
      value: data.totals.users.toString(),
      icon: Users,
    },
    {
      label: 'Transações',
      value: data.totals.transactions.toString(),
      icon: ArrowLeftRight,
    },
    {
      label: 'Receita total',
      value: formatCurrency(data.totals.totalIncome),
      icon: TrendingUp,
    },
  ];

  const ss = data.subscriptionStats;
  const subCards = [
    {
      label: 'Em trial',
      value: ss.trialing,
      icon: Clock,
      color: 'text-emerald-400',
    },
    {
      label: 'Mensal ativo',
      value: ss.monthly,
      icon: CreditCard,
      color: 'text-green-400',
    },
    {
      label: 'Anual ativo',
      value: ss.annual,
      icon: CalendarCheck,
      color: 'text-blue-400',
    },
    {
      label: 'Vitalício',
      value: ss.lifetime,
      icon: Infinity,
      color: 'text-purple-400',
    },
    {
      label: 'Pendente',
      value: ss.pastDue,
      icon: AlertTriangle,
      color: 'text-amber-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral do SaaS MeuCaixa
        </p>
      </div>

      {/* Métricas gerais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {mainCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Custo LLM */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Custo com IA (LLM)
          </CardTitle>
          <Brain className="h-4 w-4 text-violet-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.llmCost.totalBrl.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            US$ {data.llmCost.totalUsd.toFixed(4)} ·{' '}
            {(
              data.llmCost.totalPromptTokens +
              data.llmCost.totalCompletionTokens
            ).toLocaleString('pt-BR')}{' '}
            tokens consumidos
          </p>
        </CardContent>
      </Card>

      {/* Assinaturas */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Assinaturas</h2>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {subCards.map((card) => (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Empresas recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Empresas recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentCompanies.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma empresa ainda.
            </p>
          ) : (
            <div className="divide-y">
              {data.recentCompanies.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${planBadge(c.plan)}`}
                    >
                      {c.plan}
                    </span>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>
                      {c._count.users} usuários · {c._count.transactions}{' '}
                      transações
                    </p>
                    <p>Desde {formatDate(c.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
