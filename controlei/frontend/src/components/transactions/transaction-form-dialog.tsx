'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { todayLocalISO } from '@/lib/date-utils';
import { useCategories } from '@/hooks/use-categories';
import { useSegments } from '@/hooks/use-segments';
import { useBankAccounts } from '@/hooks/use-bank-accounts';
import {
  useCreateTransaction,
  useUpdateTransaction,
} from '@/hooks/use-transactions';
import type { Transaction } from '@/types/models';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const formSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE'], {
    required_error: 'Selecione o tipo',
  }),
  amount: z.coerce
    .number({ invalid_type_error: 'Valor inválido' })
    .positive('Valor deve ser maior que zero'),
  description: z
    .string()
    .min(3, 'Descrição deve ter no mínimo 3 caracteres')
    .max(255),
  date: z.string().min(1, 'Data é obrigatória'),
  dueDate: z.string().optional(),
  status: z.enum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  paymentDate: z.string().optional(),
  categoryId: z.string().optional(),
  segmentId: z.string().optional(),
  bankAccountId: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTransaction?: Transaction | null;
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  editingTransaction,
}: TransactionFormDialogProps) {
  const { data: categories } = useCategories();
  const { data: segments } = useSegments();
  const { data: bankAccounts } = useBankAccounts();
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();

  const isEditing = !!editingTransaction;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'EXPENSE',
      status: 'PENDING',
      date: todayLocalISO(),
    },
  });

  const watchStatus = watch('status');
  const watchType = watch('type');

  useEffect(() => {
    if (editingTransaction) {
      reset({
        type: editingTransaction.type,
        amount: Number(editingTransaction.amount),
        description: editingTransaction.description,
        date: editingTransaction.date.slice(0, 10),
        dueDate: editingTransaction.dueDate?.slice(0, 10) ?? '',
        status: editingTransaction.status,
        paymentDate: editingTransaction.paymentDate?.slice(0, 10) ?? '',
        categoryId: editingTransaction.categoryId ?? '',
        segmentId: editingTransaction.segmentId ?? '',
        bankAccountId:
          editingTransaction.accountTransactions?.[0]?.bankAccount.id ?? '',
        notes: editingTransaction.notes ?? '',
      });
    } else {
      reset({
        type: 'EXPENSE',
        status: 'PENDING',
        date: todayLocalISO(),
        amount: undefined,
        description: '',
        dueDate: '',
        paymentDate: '',
        categoryId: '',
        segmentId: '',
        bankAccountId: '',
        notes: '',
      });
    }
  }, [editingTransaction, reset]);

  const onSubmit = (data: FormValues) => {
    // Limpa campos vazios
    const payload: Record<string, unknown> = {
      type: data.type,
      amount: data.amount,
      description: data.description,
      date: data.date,
    };

    if (data.dueDate) payload.dueDate = data.dueDate;
    if (data.status) payload.status = data.status;
    if (data.paymentDate) payload.paymentDate = data.paymentDate;
    if (data.categoryId) payload.categoryId = data.categoryId;
    if (data.segmentId) payload.segmentId = data.segmentId;
    if (data.bankAccountId) payload.bankAccountId = data.bankAccountId;
    if (data.notes) payload.notes = data.notes;

    if (isEditing) {
      updateMutation.mutate(
        { id: editingTransaction.id, data: payload },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const isPending =
    createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Transação' : 'Nova Transação'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Altere os dados da transação'
              : 'Preencha os dados da nova transação'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Tipo */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={watchType === 'INCOME' ? 'default' : 'outline'}
              className={
                watchType === 'INCOME'
                  ? 'flex-1 bg-green-600 hover:bg-green-700'
                  : 'flex-1'
              }
              onClick={() => setValue('type', 'INCOME')}
            >
              Receita
            </Button>
            <Button
              type="button"
              variant={watchType === 'EXPENSE' ? 'default' : 'outline'}
              className={
                watchType === 'EXPENSE'
                  ? 'flex-1 bg-red-600 hover:bg-red-700'
                  : 'flex-1'
              }
              onClick={() => setValue('type', 'EXPENSE')}
            >
              Despesa
            </Button>
          </div>

          {/* Valor e Descrição */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                {...register('amount')}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">
                  {errors.amount.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={watchStatus ?? 'PENDING'}
                onValueChange={(v) =>
                  setValue('status', v as FormValues['status'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pendente</SelectItem>
                  <SelectItem value="PAID">Pago</SelectItem>
                  <SelectItem value="OVERDUE">Vencido</SelectItem>
                  <SelectItem value="CANCELLED">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Descrição da transação"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" {...register('date')} />
              {errors.date && (
                <p className="text-sm text-destructive">
                  {errors.date.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Vencimento</Label>
              <Input id="dueDate" type="date" {...register('dueDate')} />
            </div>
          </div>

          {watchStatus === 'PAID' && (
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Data de pagamento</Label>
              <Input
                id="paymentDate"
                type="date"
                {...register('paymentDate')}
              />
            </div>
          )}

          {/* Categoria e Segmento */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={watch('categoryId') || '__none__'}
                onValueChange={(v) => setValue('categoryId', v === '__none__' ? undefined : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Segmento</Label>
              <Select
                value={watch('segmentId') || '__none__'}
                onValueChange={(v) => setValue('segmentId', v === '__none__' ? undefined : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {segments?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conta bancária */}
          <div className="space-y-2">
            <Label>Conta bancária</Label>
            <Select
              value={watch('bankAccountId') || '__none__'}
              onValueChange={(v) =>
                setValue('bankAccountId', v === '__none__' ? undefined : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhuma</SelectItem>
                {bankAccounts?.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              placeholder="Observações adicionais..."
              {...register('notes')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
