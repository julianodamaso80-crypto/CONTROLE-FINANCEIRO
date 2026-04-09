import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  variant: 'positive' | 'negative' | 'neutral' | 'warning';
}

const variantColors = {
  positive: 'text-green-400',
  negative: 'text-red-400',
  neutral: 'text-foreground',
  warning: 'text-yellow-400',
};

export function KpiCard({ label, value, icon: Icon, variant }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p
          className={cn(
            'mt-2 font-display text-2xl font-semibold',
            variantColors[variant],
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
