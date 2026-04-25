'use client';

import { useState } from 'react';
import { Plus, Target, Trash2, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useGoals, useCreateGoal, useDeleteGoal, useContributeGoal } from '@/hooks/use-goals';
import type { Goal } from '@/types/models';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function GoalsPage() {
  const { data: goals, isLoading } = useGoals();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Metas e Objetivos"
        subtitle="Defina objetivos financeiros e acompanhe o progresso"
        helpTitle="Como funcionam as metas?"
        helpBody={
          <>
            <p>
              Metas são objetivos com valor-alvo e prazo. Pode ser uma viagem,
              uma reserva de emergência, troca de equipamento, etc.
            </p>
            <p>
              Você adiciona contribuições conforme guarda dinheiro pra essa meta
              — cada aporte soma ao progresso e mostra quanto falta pra atingir
              o objetivo.
            </p>
          </>
        }
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nova meta
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[180px]" />
          ))}
        </div>
      ) : goals && goals.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </div>
      ) : (
        <EmptyState onCreate={() => setOpen(true)} />
      )}

      <GoalFormDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const del = useDeleteGoal();
  const [contribOpen, setContribOpen] = useState(false);
  const completed = goal.status === 'COMPLETED' || goal.progress >= 100;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: goal.color, color: '#fff' }}
            >
              {completed ? <CheckCircle2 className="h-5 w-5" /> : <Target className="h-5 w-5" />}
            </div>
            <div>
              <p className="font-medium">{goal.name}</p>
              {goal.targetDate && (
                <p className="text-xs text-muted-foreground">
                  Até {formatDate(goal.targetDate)}
                  {goal.daysLeft !== null && goal.daysLeft > 0 && (
                    <span> • {goal.daysLeft} dias</span>
                  )}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => del.mutate(goal.id)}
            title="Remover"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-end justify-between text-sm">
            <span className="font-medium">
              {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
            </span>
            <span className={completed ? 'text-emerald-400 font-semibold' : 'text-muted-foreground'}>
              {goal.progress.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${Math.min(100, goal.progress)}%` }}
            />
          </div>
          {!completed && (
            <p className="text-xs text-muted-foreground">
              Falta {formatCurrency(goal.remaining)}
            </p>
          )}
          {completed && (
            <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20">
              Meta atingida 🎉
            </Badge>
          )}
        </div>

        <Button
          variant="secondary"
          className="mt-4 w-full"
          onClick={() => setContribOpen(true)}
          disabled={completed}
        >
          <TrendingUp className="mr-2 h-4 w-4" /> Adicionar aporte
        </Button>

        <ContributeDialog
          open={contribOpen}
          onOpenChange={setContribOpen}
          goalId={goal.id}
        />
      </CardContent>
    </Card>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
      <Target className="mb-4 h-12 w-12 text-muted-foreground" />
      <h3 className="mb-2 text-lg font-medium">Nenhuma meta criada</h3>
      <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
        Defina objetivos financeiros — viagem, reserva, novo equipamento — e
        acompanhe o quanto falta pra você chegar lá.
      </p>
      <Button onClick={onCreate}>
        <Plus className="mr-2 h-4 w-4" /> Criar primeira meta
      </Button>
    </div>
  );
}

function GoalFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const create = useCreateGoal();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await create.mutateAsync({
      name,
      description: description || undefined,
      targetAmount: parseFloat(targetAmount),
      currentAmount: currentAmount ? parseFloat(currentAmount) : 0,
      targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
    });
    setName('');
    setDescription('');
    setTargetAmount('');
    setCurrentAmount('');
    setTargetDate('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova meta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Viagem pra Praia" required />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor-alvo (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Já guardado (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <Label>Prazo (opcional)</Label>
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Salvando...' : 'Criar meta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ContributeDialog({
  open,
  onOpenChange,
  goalId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  goalId: string;
}) {
  const contribute = useContributeGoal();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await contribute.mutateAsync({
      id: goalId,
      data: {
        amount: parseFloat(amount),
        date: new Date(date).toISOString(),
        notes: notes || undefined,
      },
    });
    setAmount('');
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar aporte</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <Label>Observação</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={contribute.isPending}>
              {contribute.isPending ? 'Salvando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
