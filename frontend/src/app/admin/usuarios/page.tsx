'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Loader2,
  MoreHorizontal,
  Crown,
  Clock,
  CreditCard,
  CalendarCheck,
  Infinity,
  Trash2,
  RefreshCw,
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
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR');
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
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
    setActionLoading(userId);
    try {
      const res = await api.patch(`/admin/users/${userId}/access`, {
        accessType,
      });
      toast.success(res.data.data?.message ?? res.data.message ?? 'Atualizado');
      await fetchUsers();
    } catch {
      toast.error('Erro ao atualizar acesso');
    } finally {
      setActionLoading(null);
      setOpenMenu(null);
    }
  };

  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(`Excluir ${name} e TODA a empresa + dados? Isso é irreversível.`))
      return;
    setActionLoading(userId);
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success('Usuário e empresa excluídos');
      await fetchUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir');
    } finally {
      setActionLoading(null);
      setOpenMenu(null);
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
  const total = users.length;
  const trialing = users.filter(
    (u) => u.subscriptionStatus === 'TRIALING',
  ).length;
  const active = users.filter(
    (u) => u.subscriptionStatus === 'ACTIVE' || u.companyPlan === 'BUSINESS',
  ).length;
  const pendente = users.filter(
    (u) =>
      u.subscriptionStatus === 'PAST_DUE' ||
      u.subscriptionStatus === 'CANCELED' ||
      u.subscriptionStatus === 'EXPIRED',
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Todos os usuários cadastrados no MeuCaixa
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
        {[
          { label: 'Total', value: total, icon: Crown, color: 'text-primary' },
          {
            label: 'Em trial',
            value: trialing,
            icon: Clock,
            color: 'text-emerald-400',
          },
          {
            label: 'Pagantes',
            value: active,
            icon: CreditCard,
            color: 'text-green-400',
          },
          {
            label: 'Pendente/Cancelado',
            value: pendente,
            icon: CalendarCheck,
            color: 'text-amber-400',
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users table */}
      <Card>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nenhum usuário cadastrado ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium uppercase text-muted-foreground">
                    <th className="px-4 py-3">Usuário</th>
                    <th className="px-4 py-3">Empresa</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Acesso</th>
                    <th className="px-4 py-3">Cadastro</th>
                    <th className="px-4 py-3">Último pgto</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((u) => {
                    const badge = statusBadge(u);
                    const isSuperAdmin = u.role === 'SUPER_ADMIN';
                    const isMenuOpen = openMenu === u.id;
                    const isLoading = actionLoading === u.id;

                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-accent/50 transition-colors"
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
                        <td className="px-4 py-3 text-muted-foreground">
                          {u.companyName}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.cls}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {u.accessLabel}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDate(u.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {u.lastPaymentAt
                            ? formatDate(u.lastPaymentAt)
                            : '—'}
                        </td>
                        <td className="relative px-4 py-3 text-right">
                          {isSuperAdmin ? (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  setOpenMenu(isMenuOpen ? null : u.id)
                                }
                                disabled={isLoading}
                              >
                                {isLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MoreHorizontal className="h-4 w-4" />
                                )}
                              </Button>

                              {isMenuOpen && (
                                <>
                                  {/* backdrop */}
                                  <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setOpenMenu(null)}
                                  />
                                  <div className="absolute right-4 top-12 z-50 w-52 rounded-lg border bg-popover p-1 shadow-lg">
                                    <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                      Alterar acesso
                                    </p>
                                    <button
                                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                                      onClick={() =>
                                        handleAccess(u.id, 'TRIAL')
                                      }
                                    >
                                      <Clock className="h-4 w-4 text-emerald-400" />
                                      Trial (7 dias)
                                    </button>
                                    <button
                                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                                      onClick={() =>
                                        handleAccess(u.id, 'MONTHLY')
                                      }
                                    >
                                      <CreditCard className="h-4 w-4 text-green-400" />
                                      Mensal
                                    </button>
                                    <button
                                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                                      onClick={() =>
                                        handleAccess(u.id, 'ANNUAL')
                                      }
                                    >
                                      <CalendarCheck className="h-4 w-4 text-blue-400" />
                                      Anual
                                    </button>
                                    <button
                                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                                      onClick={() =>
                                        handleAccess(u.id, 'LIFETIME')
                                      }
                                    >
                                      <Infinity className="h-4 w-4 text-purple-400" />
                                      Vitalício
                                    </button>
                                    <div className="my-1 border-t" />
                                    <button
                                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
                                      onClick={() =>
                                        handleDelete(u.id, u.name)
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Excluir usuário
                                    </button>
                                  </div>
                                </>
                              )}
                            </>
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
    </div>
  );
}
