'use client';

import { formatCurrency, formatDate } from '@/lib/utils';
import type { Transaction } from '@/types/models';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TransactionRowActions } from './transaction-row-actions';

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  OVERDUE: 'Vencido',
  CANCELLED: 'Cancelado',
};

const statusVariants: Record<string, 'secondary' | 'success' | 'destructive' | 'warning' | 'outline'> = {
  PENDING: 'secondary',
  PAID: 'success',
  OVERDUE: 'destructive',
  CANCELLED: 'outline',
};

export function TransactionTable({
  transactions,
  onEdit,
}: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
        <p className="text-muted-foreground">
          Nenhuma transação encontrada
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead>Categoria</TableHead>
          <TableHead>Segmento</TableHead>
          <TableHead className="text-right">Valor</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[50px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((tx) => (
          <TableRow key={tx.id}>
            <TableCell className="text-sm text-muted-foreground">
              {formatDate(tx.date)}
            </TableCell>
            <TableCell className="max-w-[250px] truncate font-medium">
              {tx.description}
            </TableCell>
            <TableCell>
              {tx.category ? (
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: tx.category.color }}
                  />
                  <span className="text-sm">{tx.category.name}</span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell>
              {tx.segment ? (
                <span className="text-sm">{tx.segment.name}</span>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell
              className={`text-right text-sm font-medium ${
                tx.type === 'INCOME' ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {tx.type === 'INCOME' ? '+' : '-'}
              {formatCurrency(tx.amount)}
            </TableCell>
            <TableCell>
              <Badge variant={statusVariants[tx.status] ?? 'secondary'}>
                {statusLabels[tx.status] ?? tx.status}
              </Badge>
            </TableCell>
            <TableCell>
              <TransactionRowActions transaction={tx} onEdit={onEdit} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
