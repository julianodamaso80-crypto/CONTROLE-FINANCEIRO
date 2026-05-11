'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, Trash2, Layers } from 'lucide-react';
import { useInvoiceDetail } from '@/hooks/use-credit-cards';
import { useUpdateTransaction, useDeleteTransaction } from '@/hooks/use-transactions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Transaction } from '@/types/models';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const { data: invoice, isLoading } = useInvoiceDetail(id);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteMutation = useDeleteTransaction();

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!invoice) return <p className="text-muted-foreground">Fatura não encontrada</p>;

  const monthName = MONTHS[invoice.referenceMonth - 1];
  const target = invoice.transactions?.find((t) => t.id === deletingId) ?? null;
  const isGroup = !!target?.installmentGroupId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={invoice.creditCard ? `/credit-cards/${invoice.creditCard.id}` : '/credit-cards'}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      </div>

      <Card>
        {invoice.creditCard?.color && (
          <div className="h-2" style={{ backgroundColor: invoice.creditCard.color }} />
        )}
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">
                Fatura {monthName}/{invoice.referenceYear}
              </h1>
              <p className="text-sm text-muted-foreground">
                {invoice.creditCard?.name}
                {' • '}
                Fechamento {formatDate(invoice.closingDate)} • Vencimento {formatDate(invoice.dueDate)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold">{formatCurrency(invoice.totalAmount)}</p>
              <Badge variant="outline">
                {invoice.status === 'OPEN' && 'Aberta'}
                {invoice.status === 'CLOSED' && 'Fechada'}
                {invoice.status === 'PAID' && 'Paga'}
                {invoice.status === 'OVERDUE' && 'Vencida'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-lg font-semibold">Lançamentos</h2>
      {invoice.transactions && invoice.transactions.length > 0 ? (
        <div className="space-y-2">
          {invoice.transactions.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{t.description}</p>
                    {t.installmentNumber && t.totalInstallments ? (
                      <Badge variant="outline" className="text-xs">
                        <Layers className="mr-1 h-3 w-3" />
                        {t.installmentNumber}/{t.totalInstallments}
                      </Badge>
                    ) : null}
                    {t.isRefund && (
                      <Badge variant="outline" className="text-xs text-emerald-400">Estorno</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(t.date)}
                    {t.category ? ` • ${t.category.name}` : ''}
                    {t.segment ? ` • ${t.segment.name}` : ''}
                  </p>
                </div>
                <p className={`text-lg font-semibold ${t.isRefund ? 'text-emerald-400' : ''}`}>
                  {t.isRefund ? '-' : ''}
                  {formatCurrency(Number(t.amount))}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDeletingId(t.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
          Sem lançamentos.
        </p>
      )}

      {editing && (
        <EditTxDialog
          transaction={editing}
          onClose={() => setEditing(null)}
        />
      )}

      <Dialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir lançamento?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {isGroup
              ? `Esse lançamento faz parte de um parcelamento. Excluir vai remover TODAS as ${target?.totalInstallments ?? ''} parcelas e ajustar as faturas.`
              : 'Essa ação não pode ser desfeita.'}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deletingId) return;
                await deleteMutation.mutateAsync(deletingId);
                setDeletingId(null);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Excluindo...' : isGroup ? 'Excluir tudo' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditTxDialog({ transaction, onClose }: { transaction: Transaction; onClose: () => void }) {
  const update = useUpdateTransaction();
  const [description, setDescription] = useState(transaction.description);
  const [amount, setAmount] = useState(String(Number(transaction.amount)));
  const [date, setDate] = useState(new Date(transaction.date).toISOString().slice(0, 10));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await update.mutateAsync({
      id: transaction.id,
      data: {
        description,
        amount: parseFloat(amount),
        date: new Date(date).toISOString(),
      },
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar lançamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
          </div>
          {transaction.installmentGroupId && (
            <p className="text-xs text-amber-400">
              Edição altera apenas esta parcela ({transaction.installmentNumber}/{transaction.totalInstallments}). As outras continuam como estão.
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
