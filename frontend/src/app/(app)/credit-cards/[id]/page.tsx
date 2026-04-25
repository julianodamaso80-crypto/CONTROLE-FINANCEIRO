'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Plus, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useCreditCard, useInvoices, useAddCardExpense, usePayInvoice } from '@/hooks/use-credit-cards';
import { useCategories } from '@/hooks/use-categories';
import { useSegments } from '@/hooks/use-segments';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function CreditCardDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const { data: card, isLoading: cardLoading } = useCreditCard(id);
  const { data: invoices, isLoading: invLoading } = useInvoices(id);
  const [openExpense, setOpenExpense] = useState(false);

  if (cardLoading) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (!card) return <p className="text-muted-foreground">Cartão não encontrado</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/credit-cards"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <Button onClick={() => setOpenExpense(true)}>
          <Plus className="mr-2 h-4 w-4" /> Lançar despesa
        </Button>
      </div>

      <Card>
        <div className="h-2" style={{ backgroundColor: card.color }} />
        <CardContent className="p-5">
          <h1 className="text-xl font-semibold">{card.name}</h1>
          <p className="text-sm text-muted-foreground">
            {card.brand}
            {card.lastDigits ? ` • final ${card.lastDigits}` : ''}
            {' • '}fechamento dia {card.closingDay} • vencimento dia {card.dueDay}
          </p>
        </CardContent>
      </Card>

      <h2 className="text-lg font-semibold">Faturas</h2>
      {invLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : invoices && invoices.length > 0 ? (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <InvoiceRow key={inv.id} invoice={inv} />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
          Nenhuma fatura ainda. Lance sua primeira despesa.
        </p>
      )}

      <ExpenseDialog open={openExpense} onOpenChange={setOpenExpense} cardId={card.id} />
    </div>
  );
}

function InvoiceRow({ invoice }: { invoice: import('@/types/models').Invoice }) {
  const pay = usePayInvoice();
  const monthName = MONTHS[invoice.referenceMonth - 1];
  const statusColor: Record<string, string> = {
    OPEN: 'text-blue-400',
    CLOSED: 'text-amber-400',
    PAID: 'text-emerald-400',
    OVERDUE: 'text-red-400',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">
                Fatura {monthName}/{invoice.referenceYear}
              </p>
              <Badge variant="outline" className={statusColor[invoice.status] ?? ''}>
                {invoice.status === 'OPEN' && 'Aberta'}
                {invoice.status === 'CLOSED' && 'Fechada'}
                {invoice.status === 'PAID' && 'Paga'}
                {invoice.status === 'OVERDUE' && 'Vencida'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Fechamento {formatDate(invoice.closingDate)} • Vencimento {formatDate(invoice.dueDate)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">{formatCurrency(invoice.totalAmount)}</p>
            {invoice.remainingAmount > 0 ? (
              <p className="text-xs text-muted-foreground">
                Restam {formatCurrency(invoice.remainingAmount)}
              </p>
            ) : (
              <p className="text-xs text-emerald-400">Quitada</p>
            )}
          </div>
          {invoice.status !== 'PAID' && invoice.totalAmount > 0 && (
            <Button
              size="sm"
              onClick={() => pay.mutate({ invoiceId: invoice.id })}
              disabled={pay.isPending}
            >
              <CheckCircle2 className="mr-1 h-4 w-4" /> Pagar fatura
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ExpenseDialog({
  open,
  onOpenChange,
  cardId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cardId: string;
}) {
  const add = useAddCardExpense();
  const { data: categories } = useCategories();
  const { data: segments } = useSegments();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState('');
  const [segmentId, setSegmentId] = useState('');
  const [installments, setInstallments] = useState('1');
  const [isRefund, setIsRefund] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await add.mutateAsync({
      cardId,
      data: {
        amount: parseFloat(amount),
        description,
        date: new Date(date).toISOString(),
        categoryId: categoryId || undefined,
        segmentId: segmentId || undefined,
        totalInstallments: parseInt(installments, 10) || 1,
        isRefund,
      },
    });
    setAmount('');
    setDescription('');
    setDate(new Date().toISOString().slice(0, 10));
    setCategoryId('');
    setSegmentId('');
    setInstallments('1');
    setIsRefund(false);
    onOpenChange(false);
  };

  const expenseCategories = (categories ?? []).filter((c) => c.type === 'EXPENSE' || c.type === 'BOTH');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lançar despesa no cartão</DialogTitle>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Segmento</Label>
              <Select value={segmentId} onValueChange={setSegmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {(segments ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Parcelas</Label>
              <Input
                type="number"
                min="1"
                max="48"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isRefund}
                  onChange={(e) => setIsRefund(e.target.checked)}
                  className="h-4 w-4 rounded border-border bg-background"
                />
                Lançar como estorno
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={add.isPending}>
              {add.isPending ? 'Lançando...' : 'Lançar despesa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
