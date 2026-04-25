'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, CreditCard as CreditCardIcon, Trash2 } from 'lucide-react';
import { useCreditCards, useCreateCreditCard, useDeleteCreditCard } from '@/hooks/use-credit-cards';
import type { CreditCard, CreditCardBrand } from '@/types/models';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/shared/page-header';
import { formatCurrency } from '@/lib/utils';

const BRANDS: CreditCardBrand[] = ['VISA', 'MASTERCARD', 'ELO', 'AMEX', 'HIPERCARD', 'OUTRO'];

export default function CreditCardsPage() {
  const { data: cards, isLoading } = useCreditCards();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cartões de Crédito"
        subtitle="Cadastre seus cartões, registre despesas e gerencie suas faturas"
        helpTitle="Como funciona?"
        helpBody={
          <>
            <p>
              Cadastre cada cartão informando o <strong>dia de fechamento</strong>{' '}
              (quando a fatura fecha) e o <strong>dia de vencimento</strong>.
            </p>
            <p>
              Quando você lança uma despesa no cartão, ela vai automaticamente
              pra fatura do mês de referência correto. Se a despesa for parcelada,
              cada parcela cai numa fatura subsequente.
            </p>
            <p>
              Estornos são suportados — basta marcar a opção ao registrar.
            </p>
          </>
        }
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo cartão
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[180px]" />
          ))}
        </div>
      ) : cards && cards.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <CreditCardItem key={c.id} card={c} />
          ))}
        </div>
      ) : (
        <EmptyState onCreate={() => setOpen(true)} />
      )}

      <CardFormDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function CreditCardItem({ card }: { card: CreditCard }) {
  const del = useDeleteCreditCard();
  const used = card.usedAmount ?? 0;
  const limit = card.creditLimit;
  const pct = card.usagePct ?? 0;

  return (
    <Card className="overflow-hidden">
      <div
        className="h-2"
        style={{ backgroundColor: card.color }}
      />
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: card.color, color: '#fff' }}
            >
              <CreditCardIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{card.name}</p>
              <p className="text-xs text-muted-foreground">
                {card.brand}
                {card.lastDigits ? ` •••• ${card.lastDigits}` : ''}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => del.mutate(card.id)}
            title="Desativar"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-end justify-between text-sm">
            <span>Usado</span>
            <span className="font-semibold">
              {formatCurrency(used)} / {formatCurrency(limit)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Disp. {formatCurrency(card.availableLimit ?? 0)}</span>
            <span>
              Fecha dia {card.closingDay} • Vence dia {card.dueDay}
            </span>
          </div>
        </div>

        <Link
          href={`/credit-cards/${card.id}`}
          className="mt-4 block w-full"
        >
          <Button variant="secondary" className="w-full">
            Ver faturas e lançar despesa
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
      <CreditCardIcon className="mb-4 h-12 w-12 text-muted-foreground" />
      <h3 className="mb-2 text-lg font-medium">Nenhum cartão cadastrado</h3>
      <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
        Cadastre seus cartões e tenha controle completo das faturas, despesas
        parceladas e estornos.
      </p>
      <Button onClick={onCreate}>
        <Plus className="mr-2 h-4 w-4" /> Cadastrar primeiro cartão
      </Button>
    </div>
  );
}

function CardFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const create = useCreateCreditCard();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState<CreditCardBrand>('OUTRO');
  const [lastDigits, setLastDigits] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await create.mutateAsync({
      name,
      brand,
      lastDigits: lastDigits || undefined,
      creditLimit: creditLimit ? parseFloat(creditLimit) : 0,
      closingDay: parseInt(closingDay, 10),
      dueDay: parseInt(dueDay, 10),
    });
    setName('');
    setBrand('OUTRO');
    setLastDigits('');
    setCreditLimit('');
    setClosingDay('');
    setDueDay('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo cartão</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome do cartão</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nubank Roxinho" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Bandeira</Label>
              <Select value={brand} onValueChange={(v) => setBrand(v as CreditCardBrand)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRANDS.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Últimos 4 dígitos</Label>
              <Input value={lastDigits} onChange={(e) => setLastDigits(e.target.value)} placeholder="1234" maxLength={4} />
            </div>
          </div>
          <div>
            <Label>Limite (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              placeholder="5000"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Dia de fechamento</Label>
              <Input
                type="number"
                min="1"
                max="31"
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Dia de vencimento</Label>
              <Input
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Salvando...' : 'Criar cartão'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
