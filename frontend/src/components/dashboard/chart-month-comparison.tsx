'use client';

import { useMonthComparison } from '@/hooks/use-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';

export function ChartMonthComparison({ months = 6 }: { months?: number }) {
  const { data, isLoading } = useMonthComparison(months);

  if (isLoading) return <Skeleton className="h-[280px]" />;
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(
    ...data.flatMap((d) => [d.income, d.expense]),
    1,
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Receita vs Despesa — últimos {months} meses</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Barras agrupadas */}
          <div className="grid grid-cols-6 gap-3">
            {data.map((m) => (
              <div key={`${m.year}-${m.monthIndex}`} className="flex flex-col items-center gap-1">
                <div className="flex h-32 items-end gap-1">
                  <div
                    className="w-3 rounded-t bg-emerald-500/80"
                    style={{ height: `${(m.income / maxValue) * 100}%`, minHeight: m.income > 0 ? '2px' : 0 }}
                    title={`Receita: ${formatCurrency(m.income)}`}
                  />
                  <div
                    className="w-3 rounded-t bg-red-500/80"
                    style={{ height: `${(m.expense / maxValue) * 100}%`, minHeight: m.expense > 0 ? '2px' : 0 }}
                    title={`Despesa: ${formatCurrency(m.expense)}`}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {m.month}/{String(m.year).slice(-2)}
                </span>
                <span
                  className={`text-[10px] font-medium ${m.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                >
                  {m.balance >= 0 ? '+' : ''}{formatCurrency(m.balance)}
                </span>
              </div>
            ))}
          </div>

          {/* Legenda */}
          <div className="flex items-center justify-center gap-4 border-t pt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Receita
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Despesa
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
