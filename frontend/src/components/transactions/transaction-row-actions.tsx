'use client';

import { MoreHorizontal, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react';
import {
  useDeleteTransaction,
  useMarkTransactionAsPaid,
  useCancelTransaction,
} from '@/hooks/use-transactions';
import type { Transaction } from '@/types/models';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TransactionRowActionsProps {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
}

export function TransactionRowActions({
  transaction,
  onEdit,
}: TransactionRowActionsProps) {
  const deleteMutation = useDeleteTransaction();
  const payMutation = useMarkTransactionAsPaid();
  const cancelMutation = useCancelTransaction();

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
      deleteMutation.mutate(transaction.id);
    }
  };

  const canPay =
    transaction.status === 'PENDING' || transaction.status === 'OVERDUE';
  const canCancel =
    transaction.status !== 'CANCELLED' && transaction.status !== 'PAID';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(transaction)}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>

        {canPay && (
          <DropdownMenuItem
            onClick={() => payMutation.mutate({ id: transaction.id })}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Marcar como pago
          </DropdownMenuItem>
        )}

        {canCancel && (
          <DropdownMenuItem
            onClick={() => cancelMutation.mutate(transaction.id)}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Cancelar
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
