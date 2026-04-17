'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Loader2,
  Crown,
  Clock,
  CreditCard,
  CalendarCheck,
  Infinity,
  Trash2,
  RefreshCw,
  X,
  Pencil,
  Brain,
  MessageCircle,
  ArrowLeftRight,
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

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  companyName: string;
  companyPlan: string;
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  lastPaymentAt: string | null;
  accessLabel: string;
  totalTransactions: number;
  totalMessages: number;
  llmCostUsd: number;
  llmCostBrl: number;
  totalTokens: number;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function statusBadge(user: AdminUser) {
  const s = user.subscriptionStatus;
  const plan = user.companyPlan;

  if (plan === 'BUSINESS')
    return {
      label: 'Vitalício',
      cls: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    };
  if (s === 'ACTIVE')
    return {
      label: user.subscriptionPlan === 'ANNUAL' ? 'Anual' : 'Mensal',
      cls: 'bg-green-500/20 text-green-400 border-green-500/30',
    };
  if (s === 'TRIALING')
    return {
      label: 'Trial',
      cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    };
  if (s === 'PAST_DUE')
    return {
      label: 'Pendente',
      cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    };
  if (s === 'CANCELED')
    return {
      label: 'Cancelado',
      cls: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
  if (s === 'EXPIRED')
    return {
      label: 'Expirado',
      cls: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
  return {
    label: 'Sem plano',
    cls: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  };
}

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.data ?? res.data);
    } catch {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAccess = async (
    userId: string,
    accessType: 'TRIAL' | 'MONTHLY' | 'ANNUAL' | 'LIFETIME',
  ) => {
    setActionLoading(true);
    try {
      const res = await api.patch(`/admin/users/${userId}/access`, {
        accessType,
      });
      toast.success(res.data.data?.message ?? res.data.message ?? 'Atualizado');
      await fetchUsers();
      setEditUser(null);
    } catch {
      toast.error('Erro ao atualizar acesso');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (userId: string, name: string) => {
    if (
      !confirm(
        `Excluir ${name} e TODA a empresa + dados? Isso é irreversível.`,
      )
    )
      return;
    setActionLoading(true);
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success('Usuário e empresa excluídos');
      await fetchUsers();
      setEditUser(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Stats
  const total = users.filter((u) => u.role !== 'ADMIN').length;
  const trialing = users.filter(
    (u) => u.subscriptionStatus === 'TRIALING',
  ).length;
  const active = users.filter(
    (u) => u.subscriptionStatus === 'ACTIVE' || u.companyPlan === 'BUSINESS',
  ).length;
  const totalLlmBrl = users.reduce((s, u) => s + u.llmCostBrl, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Todos os clientes cadastrados no MeuCaixa
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            fetchUsers();
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clientes
            </CardTitle>
            <Crown className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em trial
            </CardTitle>
            <Clock className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trialing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pagantes
            </CardTitle>
            <CreditCard className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Custo LLM total
            </CardTitle>
            <Brain className="h-4 w-4 text-violet-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtBRL(totalLlmBrl)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users table */}
      <Card>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nenhum cliente cadastrado ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium uppercase text-muted-foreground">
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Uso</th>
                    <th className="px-4 py-3">Custo IA</th>
                    <th className="px-4 py-3">Cadastro</th>
                    <th className="px-4 py-3 text-right">Editar</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((u) => {
                    const badge = statusBadge(u);
                    const isSuperAdmin = u.role === 'ADMIN';

                    return (
                      <tr
                        key={u.id}
                        className="transition-colors hover:bg-accent/50"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">
                              {u.name}
                              {isSuperAdmin && (
                                <span className="ml-2 inline-flex items-center rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                                  ADMIN
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {u.email}
                            </p>
                            {u.phone && (
                              <p className="text-xs text-muted-foreground">
                                {u.phone}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.cls}`}
                          >
                            {badge.label}
                          </span>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {u.accessLabel}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span
                              className="flex items-center gap-1"
                              title="Transações"
                            >
                              <ArrowLeftRight className="h-3 w-3" />
                              {u.totalTransactions}
                            </span>
                            <span
                              className="flex items-center gap-1"
                              title="Mensagens WhatsApp"
                            >
                              <MessageCircle className="h-3 w-3" />
                              {u.totalMessages}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium">
                            {fmtBRL(u.llmCostBrl)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {u.totalTokens.toLocaleString('pt-BR')} tokens
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDate(u.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isSuperAdmin ? (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditUser(u)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
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

      {/* ========== EDIT MODAL ========== */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold">{editUser.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {editUser.email}
                </p>
                {editUser.phone && (
                  <p className="text-sm text-muted-foreground">
                    {editUser.phone}
                  </p>
                )}
              </div>
              <button
                onClick={() => setEditUser(null)}
                className="rounded-md p-1 hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Info cards */}
            <div className="mb-6 grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-accent/30 p-3 text-center">
                <p className="text-2xl font-bold">
                  {editUser.totalTransactions}
                </p>
                <p className="text-xs text-muted-foreground">Transações</p>
              </div>
              <div className="rounded-lg border bg-accent/30 p-3 text-center">
                <p className="text-2xl font-bold">{editUser.totalMessages}</p>
                <p className="text-xs text-muted-foreground">Mensagens</p>
              </div>
              <div className="rounded-lg border bg-accent/30 p-3 text-center">
                <p className="text-2xl font-bold">
                  {fmtBRL(editUser.llmCostBrl)}
                </p>
                <p className="text-xs text-muted-foreground">Custo IA</p>
              </div>
            </div>

            {/* Current status */}
            <div className="mb-6 rounded-lg border p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Status atual
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadge(editUser).cls}`}
                >
                  {statusBadge(editUser).label}
                </span>
                <span className="text-sm">{editUser.accessLabel}</span>
              </div>
              {editUser.lastPaymentAt && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Último pagamento: {formatDate(editUser.lastPaymentAt)}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Cliente desde: {formatDate(editUser.createdAt)}
              </p>
            </div>

            {/* Plan actions */}
            <p className="mb-3 text-sm font-semibold">Alterar plano</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="justify-start gap-2"
                onClick={() => handleAccess(editUser.id, 'TRIAL')}
                disabled={actionLoading}
              >
                <Clock className="h-4 w-4 text-emerald-400" />
                Trial (3 dias)
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2"
                onClick={() => handleAccess(editUser.id, 'MONTHLY')}
                disabled={actionLoading}
              >
                <CreditCard className="h-4 w-4 text-green-400" />
                Mensal
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2"
                onClick={() => handleAccess(editUser.id, 'ANNUAL')}
                disabled={actionLoading}
              >
                <CalendarCheck className="h-4 w-4 text-blue-400" />
                Anual
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2"
                onClick={() => handleAccess(editUser.id, 'LIFETIME')}
                disabled={actionLoading}
              >
                <Infinity className="h-4 w-4 text-purple-400" />
                Vitalício
              </Button>
            </div>

            {/* Danger zone */}
            <div className="mt-6 border-t pt-4">
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={() => handleDelete(editUser.id, editUser.name)}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Excluir cliente e todos os dados
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
