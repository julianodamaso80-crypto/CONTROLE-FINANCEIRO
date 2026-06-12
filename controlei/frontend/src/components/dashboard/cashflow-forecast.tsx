'use client';

import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import { useCashflowForecast } from '@/hooks/use-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';

export function CashflowForecast({ days = 60 }: { days?: number }) {
  const { data, isLoading } = useCashflowForecast(days);

  if (isLoading) return <Skeleton className="h-[260px]" />;
  if (!data) return null;

  const willGoNegative = data.minBalance < 0;
  const trend = data.finalBalance > data.initialBalance ? 'up' : 'down';
  // Usa todos os pontos pra desenhar a linha
  const points = data.daily;
  const max = Math.max(...points.map((p) => p.balance), data.initialBalance, 0);
  const min = Math.min(...points.map((p) => p.balance), data.initialBalance, 0);
  const range = max - min || 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Fluxo de caixa projetado — próximos {days} dias</span>
          {trend === 'up' ? (
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-400" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-muted/30 p-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Hoje</p>
              <p className="text-sm font-semibold">{formatCurrency(data.initialBalance)}</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Em {days}d</p>
              <p
                className={`text-sm font-semibold ${data.finalBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
              >
                {formatCurrency(data.finalBalance)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 p-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Mínimo</p>
              <p
                className={`text-sm font-semibold ${data.minBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
              >
                {formatCurrency(data.minBalance)}
              </p>
              {data.minBalanceDate && (
                <p className="text-[10px] text-muted-foreground">
                  {formatDate(data.minBalanceDate)}
                </p>
              )}
            </div>
          </div>

          {/* Mini "sparkline" SVG */}
          <div className="relative h-24 w-full">
            <svg viewBox="0 0 100 30" className="h-full w-full" preserveAspectRatio="none">
              {/* Linha do zero */}
              {min < 0 && max > 0 && (
                <line
                  x1="0"
                  y1={30 - ((0 - min) / range) * 30}
                  x2="100"
                  y2={30 - ((0 - min) / range) * 30}
                  stroke="hsl(var(--muted-foreground) / 0.4)"
                  strokeWidth="0.2"
                  strokeDasharray="1,1"
                />
              )}
              {/* Polyline do saldo */}
              <polyline
                fill="none"
                stroke={willGoNegative ? '#ef4444' : '#10b981'}
                strokeWidth="0.6"
                points={points
                  .map((p, i) => {
                    const x = (i / Math.max(1, points.length - 1)) * 100;
                    const y = 30 - ((p.balance - min) / range) * 30;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />
              {/* Área sombreada */}
              <polygon
                fill={willGoNegative ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'}
                points={`0,30 ${points
                  .map((p, i) => {
                    const x = (i / Math.max(1, points.length - 1)) * 100;
                    const y = 30 - ((p.balance - min) / range) * 30;
                    return `${x},${y}`;
                  })
                  .join(' ')} 100,30`}
              />
            </svg>
          </div>

          {willGoNegative && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p>
                <strong>Atenção:</strong> seu saldo deve ficar negativo em{' '}
                <strong>{data.minBalanceDate ? formatDate(data.minBalanceDate) : 'breve'}</strong>{' '}
                ({formatCurrency(data.minBalance)}). Considere antecipar recebíveis ou adiar pagamentos.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
