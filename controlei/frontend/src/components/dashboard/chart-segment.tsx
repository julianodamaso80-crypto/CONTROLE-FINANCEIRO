'use client';

import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SegmentData {
  segmentId: string | null;
  segmentName: string;
  segmentColor: string;
  income: number;
  expense: number;
  balance: number;
}

interface ChartSegmentProps {
  data: SegmentData[];
}

export function ChartSegment({ data }: ChartSegmentProps) {
  if (data.length === 0) return null;

  const maxAbs = Math.max(
    ...data.map((d) => Math.max(d.income, d.expense, Math.abs(d.balance))),
    1,
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Saldo por Segmento</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item) => {
            const incomePct = (item.income / maxAbs) * 100;
            const expensePct = (item.expense / maxAbs) * 100;
            const positive = item.balance >= 0;
            return (
              <div key={item.segmentId ?? 'none'} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-foreground">
                    {item.segmentName}
                  </span>
                  <span
                    className={
                      positive
                        ? 'font-semibold text-green-400'
                        : 'font-semibold text-red-400'
                    }
                  >
                    Saldo: {formatCurrency(item.balance)}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-xs text-muted-foreground">
                      Receita
                    </span>
                    <div className="relative h-5 flex-1 overflow-hidden rounded bg-muted/40">
                      <div
                        className="h-full rounded bg-green-500/80"
                        style={{ width: `${incomePct}%` }}
                      />
                      <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-foreground">
                        {formatCurrency(item.income)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-16 text-xs text-muted-foreground">
                      Despesa
                    </span>
                    <div className="relative h-5 flex-1 overflow-hidden rounded bg-muted/40">
                      <div
                        className="h-full rounded bg-red-500/80"
                        style={{ width: `${expensePct}%` }}
                      />
                      <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-foreground">
                        {formatCurrency(item.expense)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
