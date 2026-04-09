import { cn } from '@/lib/utils';

interface FinnixLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: { box: 'h-7 w-7 text-sm', text: 'text-base' },
  md: { box: 'h-9 w-9 text-lg', text: 'text-xl' },
  lg: { box: 'h-12 w-12 text-2xl', text: 'text-3xl' },
};

export function FinnixLogo({ size = 'md', className }: FinnixLogoProps) {
  const s = sizes[size];

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground',
          s.box,
        )}
      >
        F
      </div>
      <span className={cn('font-display font-semibold', s.text)}>
        Finnix
      </span>
    </div>
  );
}
