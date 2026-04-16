'use client';

import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
} from 'lucide-react';
import { useDashboard } from '@/hooks/use-dashboard';
import { useSegments } from '@/hooks/use-segments';
import { formatCurrency, formatDateInput } from '@/lib/utils';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { ChartBar } from '@/components/dashboard/chart-bar';
import { ChartPie } from '@/components/dashboard/chart-pie';
import { ChartSegment } from '@/components/dashboard/chart-segment';
import { UpcomingList } from '@/components/dashboard/upcoming-list';
import { PageHeader } from '@/components/shared/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type PeriodOption = 'this-month' | 'last-month' | 'last-30' | 'this-year';

function getPeriodDates(period: PeriodOption): {
  dateFrom: string;
  dateTo: string;
} {
  const now = new Date();
  switch (period) {
    case 'this-month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { dateFrom: formatDateInput(from), dateTo: formatDateInput(to) };
    }
    case 'last-month': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { dateFrom: formatDateInput(from), dateTo: formatDateInput(to) };
    }
    case 'last-30': {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      return { dateFrom: formatDateInput(from), dateTo: formatDateInput(now) };
    }
    case 'this-year': {
      const from = new Date(now.getFullYear(), 0, 1);
      return { dateFrom: formatDateInput(from), dateTo: formatDateInput(now) };
    }
  }
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<PeriodOption>('this-month');
  const [segmentId, setSegmentId] = useState<string>('');

  const dates = getPeriodDates(period);
  const { data, isLoading } = useDashboard({
    segmentId: segmentId || undefined,
    dateFrom: dates.dateFrom,
    dateTo: dates.dateTo,
  });
  const { data: segments } = useSegments();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral do seu negócio em um só lugar"
        helpTitle="O que você vê aqui?"
        helpBody={
          <>
            <p>
              O dashboard traz os <strong>números do seu negócio em tempo real</strong>.
              Tudo que você registra (pelo painel ou pelo WhatsApp) aparece
              aqui automaticamente.
            </p>
            <p className="pt-1">
              <strong>Indicadores principais:</strong>
            </p>
            <ul className="ml-4 list-disc space-y-0.5">
              <li><strong>Receitas</strong> — quanto entrou no período</li>
              <li><strong>Despesas</strong> — quanto saiu</li>
              <li><strong>Saldo</strong> — o lucro ou prejuízo do período</li>
              <li><strong>Vencimentos</strong> — contas próximas e atrasadas</li>
              <li><strong>Gráficos</strong> — despesas por categoria, receitas por segmento, tendência do mês</li>
            </ul>
            <p className="pt-1">
              <strong>Dica</strong>: use os filtros no canto superior direito
              pra trocar o período (este mês, mês passado, últimos 30 dias, ano)
              ou filtrar por segmento (ex: só Shopee, só Loja Física).
            </p>
          </>
        }
        actions={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={period}
              onValueChange={(v) => setPeriod(v as PeriodOption)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-month">Este mês</SelectItem>
                <SelectItem value="last-month">Mês passado</SelectItem>
                <SelectItem value="last-30">Últimos 30 dias</SelectItem>
                <SelectItem value="this-year">Este ano</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={segmentId || '__all__'}
              onValueChange={(v) => setSegmentId(v === '__all__' ? '' : v)}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Todos os segmentos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os segmentos</SelectItem>
                {segments?.map((seg) => (
                  <SelectItem key={seg.id} value={seg.id}>
                    {seg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px]" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard
              label="Receitas"
              value={formatCurrency(data.kpis.totalIncome)}
              icon={TrendingUp}
              variant="positive"
            />
            <KpiCard
              label="Despesas"
              value={formatCurrency(data.kpis.totalExpense)}
              icon={TrendingDown}
              variant="negative"
            />
            <KpiCard
              label="Saldo"
              value={formatCurrency(data.kpis.balance)}
              icon={DollarSign}
              variant={data.kpis.balance >= 0 ? 'positive' : 'negative'}
            />
            <KpiCard
              label="A receber"
              value={formatCurrency(data.kpis.pendingIncome)}
              icon={ArrowDownToLine}
              variant="neutral"
            />
            <KpiCard
              label="A pagar"
              value={formatCurrency(data.kpis.pendingExpense)}
              icon={ArrowUpFromLine}
              variant="warning"
            />
            <KpiCard
              label="Vencidas"
              value={String(data.kpis.overdueCount)}
              icon={AlertTriangle}
              variant={data.kpis.overdueCount > 0 ? 'negative' : 'neutral'}
            />
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartBar data={data.chartByDay} />
            <ChartPie data={data.chartByCategory} />
          </div>

          {/* Segmentos */}
          {data.chartBySegment.length > 0 && (
            <ChartSegment data={data.chartBySegment} />
          )}

          {/* Tabelas */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <UpcomingList
              title="Últimas transações"
              transactions={data.recentTransactions}
            />
            <UpcomingList
              title="Próximos vencimentos"
              transactions={data.upcomingDue}
              showDueDate
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
