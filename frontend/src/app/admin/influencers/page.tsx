'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Loader2,
  RefreshCw,
  Sparkles,
  Pencil,
  X,
  Wallet,
  Clock,
  Check,
  Ban,
  Users as UsersIcon,
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

interface Influencer {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  refCode: string;
  saleCommissionPct: number;
  recurringCommissionPct: number;
  pixKey: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  totalReferrals: number;
  pendingCommission: number;
  paidCommission: number;
  totalCommission: number;
}

interface Commission {
  id: string;
  type: 'SALE' | 'RECURRING';
  baseAmount: string | number;
  percentage: string | number;
  amount: string | number;
  status: 'PENDING' | 'PAID' | 'CANCELED';
  description: string | null;
  paidAt: string | null;
  createdAt: string;
  company: { name: string };
  influencer: { user: { name: string } };
}

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
  });
}

const COMMISSION_STATUS: Record<
  Commission['status'],
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

export default function AdminInfluencersPage() {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [editing, setEditing] = useState<Influencer | null>(null);
  const [editForm, setEditForm] = useState({
    refCode: '',
    saleCommissionPct: '',
    recurringCommissionPct: '',
    pixKey: '',
    isActive: true,
  });

  const fetchAll = useCallback(async () => {
    try {
      const [infRes, comRes] = await Promise.all([
        api.get('/admin/influencers'),
        api.get('/admin/commissions'),
      ]);
      setInfluencers(infRes.data.data ?? infRes.data ?? []);
      setCommissions(comRes.data.data ?? comRes.data ?? []);
    } catch {
      toast.error('Erro ao carregar influencers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (editing) {
      setEditForm({
        refCode: editing.refCode,
        saleCommissionPct: String(editing.saleCommissionPct),
        recurringCommissionPct: String(editing.recurringCommissionPct),
        pixKey: editing.pixKey ?? '',
        isActive: editing.isActive,
      });
    }
  }, [editing]);

  const handleSaveEdit = async () => {
    if (!editing) return;
    const sale = Number(editForm.saleCommissionPct);
    const rec = Number(editForm.recurringCommissionPct);
    if (
      Number.isNaN(sale) ||
      Number.isNaN(rec) ||
      sale < 0 ||
      sale > 100 ||
      rec < 0 ||
      rec > 100
    ) {
      toast.error('Comissões devem estar entre 0 e 100%');
      return;
    }
    setActionLoading(true);
    try {
      await api.patch(`/admin/influencers/${editing.id}`, {
        refCode: editForm.refCode.trim(),
        saleCommissionPct: sale,
        recurringCommissionPct: rec,
        pixKey: editForm.pixKey.trim(),
        isActive: editForm.isActive,
      });
      toast.success('Influencer atualizado');
      setEditing(null);
      await fetchAll();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Erro ao salvar';
      toast.error(typeof msg === 'string' ? msg : 'Erro ao salvar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCommission = async (
    id: string,
    action: 'pay' | 'cancel',
  ) => {
    setActionLoading(true);
    try {
      await api.patch(`/admin/commissions/${id}/${action}`);
      toast.success(action === 'pay' ? 'Comissão marcada como paga' : 'Comissão cancelada');
      await fetchAll();
    } catch {
      toast.error('Erro ao atualizar comissão');
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

  const totalPending = influencers.reduce((s, i) => s + i.pendingCommission, 0);
  const totalPaid = influencers.reduce((s, i) => s + i.paidCommission, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Influencers</h1>
          <p className="text-sm text-muted-foreground">
            Afiliados, comissões e indicações. Crie novos em Usuários → Adicionar
            conta → Influencer.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            fetchAll();
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Influencers
            </CardTitle>
            <Sparkles className="h-4 w-4 text-pink-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{influencers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Comissão pendente
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtBRL(totalPending)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Comissão paga
            </CardTitle>
            <Wallet className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtBRL(totalPaid)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Influencers table */}
      <Card>
        <CardContent className="p-0">
          {influencers.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nenhum influencer cadastrado ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium uppercase text-muted-foreground">
                    <th className="px-4 py-3">Influencer</th>
                    <th className="px-4 py-3">Código / Link</th>
                    <th className="px-4 py-3">Comissões</th>
                    <th className="px-4 py-3">Indicados</th>
                    <th className="px-4 py-3">Devido</th>
                    <th className="px-4 py-3 text-right">Editar</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {influencers.map((inf) => (
                    <tr
                      key={inf.id}
                      className="transition-colors hover:bg-accent/50"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {inf.name}
                          {!inf.isActive && (
                            <span className="ml-2 inline-flex items-center rounded bg-zinc-500/20 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400">
                              INATIVO
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {inf.email}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <code className="rounded bg-accent px-1.5 py-0.5 text-xs">
                          {inf.refCode}
                        </code>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          /register?ref={inf.refCode}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <span className="text-foreground">
                          {inf.saleCommissionPct}%
                        </span>{' '}
                        venda /{' '}
                        <span className="text-foreground">
                          {inf.recurringCommissionPct}%
                        </span>{' '}
                        recorr.
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-sm">
                          <UsersIcon className="h-3 w-3 text-muted-foreground" />
                          {inf.totalReferrals}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-amber-400">
                          {fmtBRL(inf.pendingCommission)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          pago {fmtBRL(inf.paidCommission)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditing(inf)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commissions */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Comissões</h2>
        <Card>
          <CardContent className="p-0">
            {commissions.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhuma comissão gerada ainda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-medium uppercase text-muted-foreground">
                      <th className="px-4 py-3">Influencer</th>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Valor</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {commissions.map((c) => {
                      const badge = COMMISSION_STATUS[c.status];
                      return (
                        <tr
                          key={c.id}
                          className="transition-colors hover:bg-accent/50"
                        >
                          <td className="px-4 py-3">
                            {c.influencer.user.name}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {c.company.name}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {c.type === 'SALE' ? 'Venda' : 'Recorrência'}
                            <span className="ml-1 text-muted-foreground">
                              ({Number(c.percentage)}%)
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {fmtBRL(Number(c.amount))}
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
                          <td className="px-4 py-3 text-right">
                            {c.status === 'PENDING' && (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-green-400"
                                  title="Marcar como paga"
                                  disabled={actionLoading}
                                  onClick={() => handleCommission(c.id, 'pay')}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-400"
                                  title="Cancelar"
                                  disabled={actionLoading}
                                  onClick={() =>
                                    handleCommission(c.id, 'cancel')
                                  }
                                >
                                  <Ban className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            {c.status === 'PAID' && c.paidAt && (
                              <span className="text-[11px] text-muted-foreground">
                                {formatDate(c.paidAt)}
                              </span>
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

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold">{editing.name}</h2>
                <p className="text-xs text-muted-foreground">{editing.email}</p>
              </div>
              <button
                onClick={() => setEditing(null)}
                className="rounded-md p-1 hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Código de indicação
                </label>
                <input
                  type="text"
                  value={editForm.refCode}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, refCode: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Comissão venda (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editForm.saleCommissionPct}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        saleCommissionPct: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Comissão recorrência (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editForm.recurringCommissionPct}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        recurringCommissionPct: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Chave PIX
                </label>
                <input
                  type="text"
                  value={editForm.pixKey}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, pixKey: e.target.value }))
                  }
                  placeholder="Pra repasse da comissão"
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, isActive: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border"
                />
                Influencer ativo (gera comissão em novas indicações)
              </label>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditing(null)}
                disabled={actionLoading}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={actionLoading}>
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
