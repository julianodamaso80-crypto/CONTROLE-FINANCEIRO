'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Loader2,
  History,
  UserPlus,
  Pencil,
  Trash2,
  Crown,
  Clock,
  CreditCard,
  CalendarCheck,
  Filter,
  X,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface AdminAction {
  id: string;
  adminId: string;
  adminName: string;
  adminEmail: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  targetLabel: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

interface ActionsResponse {
  items: AdminAction[];
  total: number;
  limit: number;
  offset: number;
}

const ACTION_LABEL: Record<string, { label: string; Icon: typeof History; color: string }> = {
  CREATE_USER: { label: 'Criou cliente', Icon: UserPlus, color: 'text-emerald-600' },
  UPDATE_USER_DATA: { label: 'Editou dados', Icon: Pencil, color: 'text-blue-600' },
  GRANT_TRIAL: { label: 'Trial', Icon: Clock, color: 'text-amber-600' },
  GRANT_MONTHLY: { label: 'Mensal', Icon: CreditCard, color: 'text-sky-600' },
  GRANT_ANNUAL: { label: 'Anual', Icon: CalendarCheck, color: 'text-violet-600' },
  GRANT_LIFETIME: { label: 'Vitalício', Icon: Crown, color: 'text-yellow-600' },
  DELETE_USER: { label: 'Excluiu cliente', Icon: Trash2, color: 'text-rose-600' },
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoricoPage() {
  const [data, setData] = useState<ActionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit, offset };
      if (actionFilter) params.action = actionFilter;
      const res = await api.get('/admin/actions', { params });
      setData(res.data.data ?? res.data);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, offset]);

  useEffect(() => {
    load();
  }, [load]);

  const clearFilter = () => {
    setActionFilter('');
    setOffset(0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Histórico de Ações</h1>
          <p className="text-sm text-muted-foreground">
            Tudo que os administradores fizeram no painel — quem, o quê, quando.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setOffset(0);
            }}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">Todas as ações</option>
            {Object.entries(ACTION_LABEL).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {actionFilter && (
            <Button variant="ghost" size="icon" onClick={clearFilter} title="Limpar filtro">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {data ? `${data.total} ação(ões)` : 'Carregando...'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && !data ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma ação registrada ainda.
            </div>
          ) : (
            <ol className="space-y-3">
              {data.items.map((a) => {
                const meta = ACTION_LABEL[a.action] ?? {
                  label: a.action,
                  Icon: History,
                  color: 'text-muted-foreground',
                };
                const Icon = meta.Icon;
                return (
                  <li
                    key={a.id}
                    className="flex gap-3 rounded-md border bg-card p-3 transition-colors hover:bg-accent/30"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted ${meta.color}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-medium">
                          <span className="text-foreground">{a.adminName}</span>{' '}
                          <span className="text-xs font-normal text-muted-foreground">
                            ({a.adminEmail})
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">{fmtDateTime(a.createdAt)}</p>
                      </div>
                      <p className="mt-1 text-sm text-foreground/80">{a.description}</p>
                      {a.ipAddress && (
                        <p className="mt-1 text-[11px] text-muted-foreground">IP: {a.ipAddress}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {data && data.total > limit && (
            <div className="mt-6 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {offset + 1}–{Math.min(offset + limit, data.total)} de {data.total}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0 || loading}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset + limit >= data.total || loading}
                  onClick={() => setOffset(offset + limit)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
