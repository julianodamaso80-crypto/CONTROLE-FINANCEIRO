'use client';

import { useState } from 'react';
import { Plus, Target, Trash2, AlertTriangle, AlertCircle } from 'lucide-react';
import { useBudgets, useCreateBudget, useDeleteBudget } from '@/hooks/use-budgets';
import { useCategories } from '@/hooks/use-categories';
import type { Budget } from '@/types/models';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/shared/page-header';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function BudgetsPage() {
  const { data: budgets, isLoading } = useBudgets();
  const { data: categories } = useCategories();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orçamentos"
        subtitle="Defina limites de gastos por categoria e receba alertas quando estourar"
        helpTitle="Como funcionam os orçamentos?"
        helpBody={
          <>
            <p>
              Você define quanto pretende gastar em uma categoria num período.
              Conforme as despesas vão entrando, calculamos automaticamente o
              consumo.
            </p>
            <p>
              Quando o consumo atinge o <strong>limite de alerta</strong> (por padrão
              80%), enviamos um aviso por WhatsApp. Quando estoura 100%, sinalizamos
              em vermelho aqui e por mensagem.
            </p>
          </>
        }
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo orçamento
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[140px]" />
          ))}
        </div>
      ) : budgets && budgets.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map((b) => (
            <BudgetCard key={b.id} budget={b} />
          ))}
        </div>
      ) : (
        <EmptyState onCreate={() => setOpen(true)} />
      )}

      <BudgetFormDialog
        open={open}
        onOpenChange={setOpen}
        categories={(categories ?? []).filter((c) => c.type === 'EXPENSE' || c.type === 'BOTH')}
      />
    </div>
  );
}

function BudgetCard({ budget }: { budget: Budget }) {
  const del = useDeleteBudget();
  const pct = Math.min(100, budget.usedPct);
  const color = budget.exceeded
    ? 'bg-red-500'
    : budget.alertReached
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold"
              style={{ backgroundColor: budget.category.color, color: '#000' }}
            >
              {budget.category.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium">{budget.category.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(budget.startDate)} → {formatDate(budget.endDate)}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => del.mutate(budget.id)}
            title="Remover"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-end justify-between text-sm">
            <span className="font-medium">
              {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
            </span>
            <span
              className={
                budget.exceeded
                  ? 'text-red-400 font-semibold'
                  : budget.alertReached
                    ? 'text-amber-400 font-semibold'
                    : 'text-muted-foreground'
              }
            >
              {budget.usedPct.toFixed(0)}%
            </span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${color}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {budget.exceeded ? (
            <div className="flex items-center gap-1 text-xs text-red-400">
              <AlertCircle className="h-3 w-3" />
              Estourou em {formatCurrency(Math.abs(budget.remaining))}
            </div>
          ) : budget.alertReached ? (
            <div className="flex items-center gap-1 text-xs text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              Atingiu o alerta de {budget.alertThreshold}%
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              Resta {formatCurrency(budget.remaining)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
      <Target className="mb-4 h-12 w-12 text-muted-foreground" />
      <h3 className="mb-2 text-lg font-medium">Nenhum orçamento criado</h3>
      <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
        Crie limites por categoria e receba alertas quando seu gasto chegar perto
        de estourar — pelo painel e pelo WhatsApp.
      </p>
      <Button onClick={onCreate}>
        <Plus className="mr-2 h-4 w-4" /> Criar primeiro orçamento
      </Button>
    </div>
  );
}

function BudgetFormDialog({
  open,
  onOpenChange,
  categories,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: Array<{ id: string; name: string }>;
}) {
  const create = useCreateBudget();
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [threshold, setThreshold] = useState('80');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !amount) return;
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end =
      period === 'MONTHLY'
        ? new Date(today.getFullYear(), today.getMonth() + 1, 0)
        : new Date(today.getFullYear(), 11, 31);

    await create.mutateAsync({
      categoryId,
      amount: parseFloat(amount),
      period,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      alertThreshold: parseInt(threshold, 10) || 80,
    });
    setCategoryId('');
    setAmount('');
    setThreshold('80');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo orçamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Limite mensal (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="2000,00"
            />
          </div>
          <div>
            <Label>Período</Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as 'MONTHLY' | 'YEARLY')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MONTHLY">Mensal</SelectItem>
                <SelectItem value="YEARLY">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Alerta em (% do limite)</Label>
            <Input
              type="number"
              min="1"
              max="100"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Salvando...' : 'Criar orçamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
