'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
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

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: SegmentData }>;
}) {
  if (!active || !payload?.[0]) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover p-3 text-sm shadow-md">
      <p className="font-medium">{item.segmentName}</p>
      <p className="text-green-400">Receita: {formatCurrency(item.income)}</p>
      <p className="text-red-400">Despesa: {formatCurrency(item.expense)}</p>
      <p className="font-semibold">Saldo: {formatCurrency(item.balance)}</p>
    </div>
  );
}

export function ChartSegment({ data }: ChartSegmentProps) {
  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Saldo por Segmento</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <XAxis
                type="number"
                tick={{ fill: 'hsl(220 9% 56%)', fontSize: 11 }}
                tickFormatter={(v: number) => formatCurrency(v)}
              />
              <YAxis
                type="category"
                dataKey="segmentName"
                tick={{ fill: 'hsl(220 9% 56%)', fontSize: 12 }}
                width={120}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="balance" radius={[0, 4, 4, 0]}>
                {data.map((entry) => (
                  <Cell
                    key={entry.segmentId ?? 'none'}
                    fill={entry.balance >= 0 ? '#4ade80' : '#f87171'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
