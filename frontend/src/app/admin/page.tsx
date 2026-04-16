'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  MessageCircle,
  Brain,
  TrendingUp,
  Clock,
  CreditCard,
  CalendarCheck,
  Infinity,
  AlertTriangle,
  Activity,
  Loader2,
} from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AdminDashboard {
  clients: {
    total: number;
    thisMonth: number;
    thisWeek: number;
    activeLastWeek: number;
  };
  messages: {
    total: number;
    thisMonth: number;
  };
  revenue: {
    mrr: number;
  };
  llmCost: {
    totalUsd: number;
    totalBrl: number;
    totalTokens: number;
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
  recentClients: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    companyName: string;
    status: string;
    createdAt: string;
  }>;
}

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR');
}

function statusColor(status: string) {
  switch (status) {
    case 'Mensal':
    case 'Anual':
      return 'bg-green-500/20 text-green-400';
    case 'Trial':
      return 'bg-emerald-500/20 text-emerald-400';
    case 'Vitalício':
      return 'bg-purple-500/20 text-purple-400';
    case 'Pendente':
      return 'bg-amber-500/20 text-amber-400';
    case 'Cancelado':
      return 'bg-red-500/20 text-red-400';
    default:
      return 'bg-zinc-500/20 text-zinc-400';
  }
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/overview')
      .then((res) => setData(res.data.data ?? res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-muted-foreground">
        Não foi possível carregar o dashboard.
      </div>
    );
  }

  const ss = data.subscriptionStats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Painel administrativo do MeuCaixa
        </p>
      </div>

      {/* Clientes + Receita */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de clientes
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.clients.total}</div>
            <p className="text-xs text-muted-foreground">
              +{data.clients.thisMonth} este mês · +{data.clients.thisWeek}{' '}
              esta semana
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clientes ativos (7d)
            </CardTitle>
            <Activity className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.clients.activeLastWeek}
            </div>
            <p className="text-xs text-muted-foreground">
              usaram o bot nos últimos 7 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              MRR estimado
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fmtBRL(data.revenue.mrr)}
            </div>
            <p className="text-xs text-muted-foreground">
              receita recorrente mensal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Custo IA (LLM)
            </CardTitle>
            <Brain className="h-4 w-4 text-violet-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fmtBRL(data.llmCost.totalBrl)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.llmCost.totalTokens.toLocaleString('pt-BR')} tokens
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Mensagens + Assinaturas */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Mensagens */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-4 w-4" />
              Mensagens WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-4">
              <div>
                <p className="text-3xl font-bold">{data.messages.total}</p>
                <p className="text-xs text-muted-foreground">total</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">
                  {data.messages.thisMonth}
                </p>
                <p className="text-xs text-muted-foreground">este mês</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assinaturas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" />
              Assinaturas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-3 text-center">
              <div>
                <Clock className="mx-auto mb-1 h-4 w-4 text-emerald-400" />
                <p className="text-xl font-bold">{ss.trialing}</p>
                <p className="text-[10px] text-muted-foreground">Trial</p>
              </div>
              <div>
                <CreditCard className="mx-auto mb-1 h-4 w-4 text-green-400" />
                <p className="text-xl font-bold">{ss.monthly}</p>
                <p className="text-[10px] text-muted-foreground">Mensal</p>
              </div>
              <div>
                <CalendarCheck className="mx-auto mb-1 h-4 w-4 text-blue-400" />
                <p className="text-xl font-bold">{ss.annual}</p>
                <p className="text-[10px] text-muted-foreground">Anual</p>
              </div>
              <div>
                <Infinity className="mx-auto mb-1 h-4 w-4 text-purple-400" />
                <p className="text-xl font-bold">{ss.lifetime}</p>
                <p className="text-[10px] text-muted-foreground">Vitalício</p>
              </div>
              <div>
                <AlertTriangle className="mx-auto mb-1 h-4 w-4 text-amber-400" />
                <p className="text-xl font-bold">{ss.pastDue}</p>
                <p className="text-[10px] text-muted-foreground">Pendente</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clientes recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4" />
            Últimos cadastros
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.recentClients.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Nenhum cliente ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium uppercase text-muted-foreground">
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Contato</th>
                    <th className="px-4 py-3">Plano</th>
                    <th className="px-4 py-3">Cadastro</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.recentClients.map((c) => (
                    <tr
                      key={c.id}
                      className="transition-colors hover:bg-accent/50"
                    >
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-muted-foreground">
                          {c.email}
                        </p>
                        {c.phone && (
                          <p className="text-xs text-muted-foreground">
                            {c.phone}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor(c.status)}`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(c.createdAt)}
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
  );
}
