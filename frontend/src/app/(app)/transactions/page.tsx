'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTransactions } from '@/hooks/use-transactions';
import type { Transaction } from '@/types/models';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TransactionFilters } from '@/components/transactions/transaction-filters';
import { TransactionTable } from '@/components/transactions/transaction-table';
import { TransactionFormDialog } from '@/components/transactions/transaction-form-dialog';
import { ExportCsvButton } from '@/components/transactions/export-csv-button';
import { ImportOfxDialog } from '@/components/transactions/import-ofx-dialog';
import { PageHeader } from '@/components/shared/page-header';

interface Filters {
  type?: string;
  status?: string;
  segmentId?: string;
  categoryId?: string;
  search?: string;
}

export default function TransactionsPage() {
  const [filters, setFilters] = useState<Filters>({});
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const { data, isLoading } = useTransactions({
    ...filters,
    page: String(page),
    limit: '20',
  });

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setDialogOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditingTransaction(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transações"
        subtitle="Lista de todas as receitas e despesas do seu negócio"
        helpTitle="O que você pode fazer aqui?"
        helpBody={
          <>
            <p>
              Aqui ficam <strong>todos os lançamentos</strong> — tanto os que
              você cria manualmente quanto os registrados pelo WhatsApp.
              Use os filtros no topo pra encontrar o que precisa (por tipo,
              status, categoria, período, segmento).
            </p>
            <p className="pt-1">
              <strong>Pra cadastrar no painel</strong>: clique em{' '}
              <em>Nova Transação</em> e preencha: tipo (receita/despesa),
              valor, descrição, categoria, data, status (pendente/pago).
            </p>
            <p>
              <strong>Pra cadastrar pelo WhatsApp</strong> (mais rápido):
              manda mensagem pro bot:
            </p>
            <ul className="ml-4 list-disc space-y-0.5">
              <li><em>&quot;gastei 50 no uber&quot;</em> → despesa de R$50</li>
              <li><em>&quot;paguei 1500 aluguel&quot;</em> → despesa de R$1500</li>
              <li><em>&quot;recebi 2k do cliente silva&quot;</em> → receita de R$2000</li>
              <li><em>&quot;recebi 500 da shopee&quot;</em> → receita de R$500</li>
              <li>Ou manda foto do cupom/nota fiscal — o bot lê e cadastra sozinho</li>
            </ul>
            <p className="pt-1">
              <strong>Status</strong>: uma transação pode ser{' '}
              <em>Pendente</em> (a pagar/receber), <em>Pago</em> (já saiu/entrou)
              ou <em>Cancelada</em>. Só as pagas entram no cálculo de
              receita/despesa do dashboard.
            </p>
          </>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ImportOfxDialog />
            <ExportCsvButton />
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Transação
            </Button>
          </div>
        }
      />

      <TransactionFilters
        filters={filters}
        onChange={(f) => {
          setFilters(f);
          setPage(1);
        }}
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <>
          <TransactionTable
            transactions={data?.data ?? []}
            onEdit={handleEdit}
          />

          {/* Paginação */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando {data.data.length} de {data.pagination.total}{' '}
                transações
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <TransactionFormDialog
        open={dialogOpen}
        onOpenChange={handleOpenChange}
        editingTransaction={editingTransaction}
      />
    </div>
  );
}
