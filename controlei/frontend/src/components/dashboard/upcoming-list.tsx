import { formatCurrency, formatDate } from '@/lib/utils';
import type { Transaction } from '@/types/models';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface UpcomingListProps {
  title: string;
  transactions: Transaction[];
  showDueDate?: boolean;
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

export function UpcomingList({
  title,
  transactions,
  showDueDate = false,
}: UpcomingListProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma transação encontrada
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(
                      showDueDate && tx.dueDate ? tx.dueDate : tx.date,
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">
                    {tx.description}
                  </TableCell>
                  <TableCell
                    className={`text-right text-sm font-medium ${
                      tx.type === 'INCOME'
                        ? 'text-green-400'
                        : 'text-red-400'
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
