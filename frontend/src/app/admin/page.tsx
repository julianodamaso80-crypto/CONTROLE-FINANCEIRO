'use client';

import { useEffect, useState } from 'react';
import { Building2, Users, ArrowLeftRight, TrendingUp } from 'lucide-react';
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

  const cards = [
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral do SaaS MeuCaixa
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
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
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.email}</p>
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
