'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartBarProps {
  data: Array<{ date: string; income: number; expense: number }>;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-md border bg-popover p-3 text-sm shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((entry) => (
        <p
          key={entry.dataKey}
          className={
            entry.dataKey === 'income' ? 'text-green-400' : 'text-red-400'
          }
        >
          {entry.dataKey === 'income' ? 'Receita' : 'Despesa'}:{' '}
          {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

export function ChartBar({ data }: ChartBarProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Receitas vs Despesas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(220 14% 16%)"
              />
              <XAxis
                dataKey="date"
                tick={{ fill: 'hsl(220 9% 56%)', fontSize: 11 }}
                tickFormatter={(v: string) => v.slice(8)}
              />
              <YAxis
                tick={{ fill: 'hsl(220 9% 56%)', fontSize: 11 }}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                }
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="income" fill="#4ade80" radius={[2, 2, 0, 0]} />
              <Bar dataKey="expense" fill="#f87171" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
