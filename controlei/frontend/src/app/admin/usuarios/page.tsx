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
  UserPlus,
  User as UserIcon,
  Shield,
  Sparkles,
  Copy,
  CheckCircle2,
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

type AccessType = 'TRIAL' | 'MONTHLY' | 'ANNUAL' | 'LIFETIME';
type AccountRole = 'USER' | 'ADMIN' | 'INFLUENCER';

interface InfluencerOption {
  id: string;
  name: string;
  refCode: string;
}

interface CreateForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  accessType: AccessType;
  role: AccountRole;
  referredByInfluencerId: string;
  refCode: string;
  saleCommissionPct: string;
  recurringCommissionPct: string;
  pixKey: string;
}

const EMPTY_CREATE_FORM: CreateForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  accessType: 'TRIAL',
  role: 'USER',
  referredByInfluencerId: '',
  refCode: '',
  saleCommissionPct: '30',
  recurringCommissionPct: '10',
  pixKey: '',
};

const SITE_NAME = 'Controlei';

/** URL de acesso conforme o tipo de conta (usa o domínio atual do admin). */
function buildAccessUrl(role: AccountRole): string {
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://controlei.ia.br';
  if (role === 'ADMIN') return `${origin}/admin`;
  if (role === 'INFLUENCER') return `${origin}/influencer`;
  return `${origin}/login`;
}

/** Monta a mensagem pronta pra enviar ao novo usuário (login + senha + link). */
function buildCredentialsMessage(p: {
  name: string;
  email: string;
  password: string;
  role: AccountRole;
  attached: boolean;
}): string {
  const url = buildAccessUrl(p.role);
  if (p.attached) {
    // Cliente que virou influencer: usa o login que já tem, sem senha nova.
    return [
      `Olá, ${p.name}! 🎉`,
      ``,
      `Você agora também é influencer no ${SITE_NAME}!`,
      `Use o mesmo login de sempre — suas comissões já estão configuradas.`,
      ``,
      `🔗 Painel do influencer: ${url}`,
      `📧 Login: ${p.email}`,
    ].join('\n');
  }
  const areaLabel =
    p.role === 'ADMIN'
      ? 'o painel admin'
      : p.role === 'INFLUENCER'
        ? 'o painel do influencer'
        : 'sua conta';
  return [
    `Olá, ${p.name}! 👋`,
    ``,
    `Sua conta no ${SITE_NAME} está pronta. Acesse ${areaLabel}:`,
    ``,
    `🔗 Link: ${url}`,
    `📧 Login: ${p.email}`,
    `🔑 Senha provisória: ${p.password}`,
    ``,
    `Recomendo trocar a senha após o primeiro acesso. 😉`,
  ].join('\n');
}

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });
  const [createOpen, setCreateOpen] = useState(false);
  const [influencerOptions, setInfluencerOptions] = useState<
    InfluencerOption[]
  >([]);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE_FORM);
  // Resultado da criação — dispara a tela de "copiar dados pra enviar"
  const [createdResult, setCreatedResult] = useState<{
    name: string;
    email: string;
    password: string;
    role: AccountRole;
    url: string;
    attached: boolean;
    message: string;
  } | null>(null);

  // Sincroniza form quando abre o modal
  useEffect(() => {
    if (editUser) {
      setEditForm({
        name: editUser.name,
        email: editUser.email,
        phone: editUser.phone ?? '',
      });
    }
  }, [editUser]);

  const formChanged =
    editUser !== null &&
    (editForm.name !== editUser.name ||
      editForm.email !== editUser.email ||
      editForm.phone !== (editUser.phone ?? ''));

  const handleSaveData = async () => {
    if (!editUser || !formChanged) return;
    setActionLoading(true);
    try {
      const payload: { name?: string; email?: string; phone?: string } = {};
      if (editForm.name !== editUser.name) payload.name = editForm.name;
      if (editForm.email !== editUser.email) payload.email = editForm.email;
      if (editForm.phone !== (editUser.phone ?? '')) payload.phone = editForm.phone;
      await api.patch(`/admin/users/${editUser.id}`, payload);
      toast.success('Dados atualizados');
      await fetchUsers();
      setEditUser(null);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Erro ao salvar';
      toast.error(typeof msg === 'string' ? msg : 'Erro ao salvar');
    } finally {
      setActionLoading(false);
    }
  };

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

  const resetCreateForm = () => setCreateForm(EMPTY_CREATE_FORM);

  // Fecha o modal e zera tudo (form + tela de resultado)
  const closeCreate = () => {
    setCreateOpen(false);
    setCreatedResult(null);
    resetCreateForm();
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Mensagem copiada!');
    } catch {
      toast.error('Não consegui copiar — selecione e copie manualmente.');
    }
  };

  const openCreate = async () => {
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateOpen(true);
    try {
      const res = await api.get('/admin/influencers/simple');
      setInfluencerOptions(res.data.data ?? res.data ?? []);
    } catch {
      // sem influencers ainda — dropdown fica vazio, sem erro
    }
  };

  const handleCreate = async () => {
    if (
      !createForm.name.trim() ||
      !createForm.email.trim() ||
      !createForm.phone.trim() ||
      !createForm.password
    ) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (createForm.password.length < 6) {
      toast.error('Senha precisa ter no mínimo 6 caracteres');
      return;
    }

    const role = createForm.role;
    type CreatePayload = {
      name: string;
      email: string;
      phone: string;
      password: string;
      accessType: AccessType;
      role: AccountRole;
      referredByInfluencerId?: string;
      influencer?: {
        refCode?: string;
        saleCommissionPct: number;
        recurringCommissionPct: number;
        pixKey?: string;
      };
    };

    const payload: CreatePayload = {
      name: createForm.name.trim(),
      email: createForm.email.trim(),
      phone: createForm.phone.trim(),
      password: createForm.password,
      accessType: createForm.accessType,
      role,
    };

    if (role === 'USER' && createForm.referredByInfluencerId) {
      payload.referredByInfluencerId = createForm.referredByInfluencerId;
    }

    if (role === 'INFLUENCER') {
      const sale = Number(createForm.saleCommissionPct);
      const rec = Number(createForm.recurringCommissionPct);
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
      payload.influencer = {
        refCode: createForm.refCode.trim() || undefined,
        saleCommissionPct: sale,
        recurringCommissionPct: rec,
        pixKey: createForm.pixKey.trim() || undefined,
      };
    }

    setActionLoading(true);
    try {
      const res = await api.post('/admin/users', payload);
      const data = res.data.data ?? res.data ?? {};
      const attached = data.attachedToExisting === true;
      const created = {
        name: payload.name,
        email: payload.email,
        password: payload.password,
        role,
        url: buildAccessUrl(role),
        attached,
        message: buildCredentialsMessage({
          name: payload.name,
          email: payload.email,
          password: payload.password,
          role,
          attached,
        }),
      };
      toast.success(
        data.message ?? 'Conta criada com sucesso',
      );
      setCreatedResult(created);
      await fetchUsers();
    } catch (e: unknown) {
      const err = e as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };
      const backendMsg = err?.response?.data?.message;
      const msg =
        typeof backendMsg === 'string' && backendMsg
          ? backendMsg
          : err?.response?.status
            ? `Erro ${err.response.status} ao criar conta (servidor não retornou detalhe)`
            : err?.message
              ? `Sem resposta do servidor: ${err.message}`
              : 'Erro ao criar conta';
      toast.error(msg);
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
            Todos os clientes cadastrados no Controlei
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button size="sm" onClick={openCreate}>
            <UserPlus className="mr-2 h-4 w-4" />
            Adicionar conta
          </Button>
        </div>
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

      {/* ========== CREATE MODAL ========== */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border-2 bg-card shadow-2xl">
            <div className="flex items-start justify-between border-b-2 px-6 pb-4 pt-6">
              <div>
                <h2 className="text-xl font-extrabold text-foreground">
                  {createdResult ? 'Pronto!' : 'Adicionar conta'}
                </h2>
                <p className="text-sm font-semibold text-foreground/70">
                  {createdResult
                    ? 'Copie e envie os dados de acesso.'
                    : 'Cliente, administrador ou influencer.'}
                </p>
              </div>
              <button
                onClick={closeCreate}
                className="rounded-md border-2 p-1.5 hover:bg-accent"
              >
                <X className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {createdResult ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle2 className="h-6 w-6" strokeWidth={2.5} />
                    <span className="text-base font-extrabold">
                      {createdResult.attached
                        ? 'Perfil de influencer adicionado!'
                        : 'Conta criada com sucesso!'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-foreground/70">
                    {createdResult.attached
                      ? 'Essa pessoa já tinha conta — anexei o perfil de influencer. Ela acessa com o login que já usa.'
                      : 'Mensagem pronta pra enviar com login, senha e link de acesso.'}
                  </p>
                  <div className="space-y-2 rounded-md border-2 bg-background px-4 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold text-foreground/60">Link</span>
                      <span className="truncate font-semibold text-foreground">
                        {createdResult.url}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold text-foreground/60">Login</span>
                      <span className="truncate font-semibold text-foreground">
                        {createdResult.email}
                      </span>
                    </div>
                    {!createdResult.attached && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold text-foreground/60">
                          Senha provisória
                        </span>
                        <span className="font-semibold text-foreground">
                          {createdResult.password}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-bold text-foreground">
                      Mensagem pronta
                    </label>
                    <pre className="mt-1.5 whitespace-pre-wrap break-words rounded-md border-2 border-dashed bg-muted/40 px-4 py-3 text-sm font-medium text-foreground">
                      {createdResult.message}
                    </pre>
                  </div>
                </div>
              ) : (
                <>
              <div>
                <label className="text-sm font-bold text-foreground">
                  Tipo de conta
                </label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {(
                    [
                      { v: 'USER', label: 'Cliente', icon: UserIcon, cls: 'text-green-500' },
                      { v: 'INFLUENCER', label: 'Influencer', icon: Sparkles, cls: 'text-pink-500' },
                      { v: 'ADMIN', label: 'Admin', icon: Shield, cls: 'text-amber-500' },
                    ] as const
                  ).map((opt) => {
                    const Icon = opt.icon;
                    const selected = createForm.role === opt.v;
                    return (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() =>
                          setCreateForm((f) => ({ ...f, role: opt.v }))
                        }
                        className={`flex flex-col items-center gap-1.5 rounded-md border-2 px-2 py-3 text-sm font-bold transition-colors ${
                          selected
                            ? 'border-primary bg-primary/15 text-foreground'
                            : 'border-border text-foreground/80 hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${opt.cls}`} strokeWidth={2.5} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-foreground">
                  Nome
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Nome completo"
                  className="mt-1.5 w-full rounded-md border-2 bg-background px-3 py-2.5 text-sm font-semibold text-foreground placeholder:font-medium placeholder:text-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-foreground">
                  Email
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="cliente@email.com"
                  className="mt-1.5 w-full rounded-md border-2 bg-background px-3 py-2.5 text-sm font-semibold text-foreground placeholder:font-medium placeholder:text-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-foreground">
                  WhatsApp (com DDD)
                </label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="(21) 99999-9999"
                  className="mt-1.5 w-full rounded-md border-2 bg-background px-3 py-2.5 text-sm font-semibold text-foreground placeholder:font-medium placeholder:text-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="mt-1.5 text-xs font-semibold text-foreground/60">
                  Salva sempre como JID (55+DDD+número).
                </p>
              </div>
              <div>
                <label className="text-sm font-bold text-foreground">
                  Senha provisória
                </label>
                <input
                  type="text"
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, password: e.target.value }))
                  }
                  placeholder="Mínimo 6 caracteres"
                  className="mt-1.5 w-full rounded-md border-2 bg-background px-3 py-2.5 text-sm font-semibold text-foreground placeholder:font-medium placeholder:text-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              {/* ----- CLIENTE: plano inicial + indicado por ----- */}
              {createForm.role === 'USER' && (
                <>
                  <div>
                    <label className="text-sm font-bold text-foreground">
                      Plano inicial
                    </label>
                    <div className="mt-1.5 grid grid-cols-2 gap-2">
                      {(
                        [
                          { v: 'TRIAL', label: 'Trial (3 dias)', icon: Clock, cls: 'text-emerald-500' },
                          { v: 'MONTHLY', label: 'Mensal', icon: CreditCard, cls: 'text-green-500' },
                          { v: 'ANNUAL', label: 'Anual', icon: CalendarCheck, cls: 'text-blue-500' },
                          { v: 'LIFETIME', label: 'Vitalício', icon: Infinity, cls: 'text-purple-500' },
                        ] as const
                      ).map((opt) => {
                        const Icon = opt.icon;
                        const selected = createForm.accessType === opt.v;
                        return (
                          <button
                            key={opt.v}
                            type="button"
                            onClick={() =>
                              setCreateForm((f) => ({ ...f, accessType: opt.v }))
                            }
                            className={`flex items-center gap-2 rounded-md border-2 px-3 py-2.5 text-sm font-bold transition-colors ${
                              selected
                                ? 'border-primary bg-primary/15 text-foreground'
                                : 'border-border text-foreground/80 hover:bg-accent hover:text-foreground'
                            }`}
                          >
                            <Icon className={`h-4 w-4 ${opt.cls}`} strokeWidth={2.5} />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-foreground">
                      Indicado por (influencer)
                    </label>
                    <select
                      value={createForm.referredByInfluencerId}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          referredByInfluencerId: e.target.value,
                        }))
                      }
                      className="mt-1.5 w-full rounded-md border-2 bg-background px-3 py-2.5 text-sm font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">Ninguém / venda direta</option>
                      {influencerOptions.map((inf) => (
                        <option key={inf.id} value={inf.id}>
                          {inf.name} ({inf.refCode})
                        </option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-xs font-semibold text-foreground/60">
                      Se vier por link de influencer, a comissão é atribuída a ele.
                    </p>
                  </div>
                </>
              )}

              {/* ----- INFLUENCER: código + comissões + PIX ----- */}
              {createForm.role === 'INFLUENCER' && (
                <>
                  <div>
                    <label className="text-sm font-bold text-foreground">
                      Código de indicação (opcional)
                    </label>
                    <input
                      type="text"
                      value={createForm.refCode}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, refCode: e.target.value }))
                      }
                      placeholder="ex: joao (gera do nome se vazio)"
                      className="mt-1.5 w-full rounded-md border-2 bg-background px-3 py-2.5 text-sm font-semibold text-foreground placeholder:font-medium placeholder:text-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <p className="mt-1.5 text-xs font-semibold text-foreground/60">
                      Vira o link: /register?ref=&lt;código&gt;
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-bold text-foreground">
                        Comissão venda (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={createForm.saleCommissionPct}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            saleCommissionPct: e.target.value,
                          }))
                        }
                        className="mt-1.5 w-full rounded-md border-2 bg-background px-3 py-2.5 text-sm font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-foreground">
                        Comissão recorrência (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={createForm.recurringCommissionPct}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            recurringCommissionPct: e.target.value,
                          }))
                        }
                        className="mt-1.5 w-full rounded-md border-2 bg-background px-3 py-2.5 text-sm font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-foreground">
                      Chave PIX (opcional)
                    </label>
                    <input
                      type="text"
                      value={createForm.pixKey}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, pixKey: e.target.value }))
                      }
                      placeholder="Pra repasse da comissão"
                      className="mt-1.5 w-full rounded-md border-2 bg-background px-3 py-2.5 text-sm font-semibold text-foreground placeholder:font-medium placeholder:text-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </>
              )}
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t-2 px-6 pb-6 pt-5">
              {createdResult ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCreatedResult(null);
                      resetCreateForm();
                    }}
                    className="border-2 font-bold"
                  >
                    Criar outra
                  </Button>
                  <Button
                    onClick={() => copyToClipboard(createdResult.message)}
                    className="gap-2 font-bold"
                  >
                    <Copy className="h-4 w-4" />
                    Copiar mensagem
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={closeCreate}
                    disabled={actionLoading}
                    className="border-2 font-bold"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={actionLoading}
                    className="font-bold"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Criar conta'
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== EDIT MODAL ========== */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl">
            <div className="mb-6 flex items-start justify-between">
              <h2 className="text-lg font-bold">Editar cliente</h2>
              <button
                onClick={() => setEditUser(null)}
                className="rounded-md p-1 hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Editable fields */}
            <div className="mb-6 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Nome
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, email: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  WhatsApp (com DDD)
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="5562998173810 ou (62) 99817-3810"
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Aceita formato livre. Salva sempre como JID (55+DDD+número).
                </p>
              </div>
              <Button
                onClick={handleSaveData}
                disabled={!formChanged || actionLoading}
                className="w-full"
                size="sm"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Salvar alterações'
                )}
              </Button>
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
