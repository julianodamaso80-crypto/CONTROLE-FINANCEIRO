'use client';

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  helpTitle?: string;
  helpBody: React.ReactNode;
  actions?: React.ReactNode;
}

/**
 * Cabeçalho padrão de página com título, subtítulo e um botão de ajuda
 * que expande uma caixa explicativa com exemplos de uso.
 */
export function PageHeader({
  title,
  subtitle,
  helpTitle,
  helpBody,
  actions,
}: PageHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm text-muted-foreground">{subtitle}</p>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              aria-expanded={open}
            >
              <HelpCircle className="h-3 w-3" />
              {open ? 'Ocultar ajuda' : 'Como funciona?'}
            </button>
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {open && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
          {helpTitle && (
            <h3 className="mb-2 font-semibold text-foreground">{helpTitle}</h3>
          )}
          <div className="space-y-2 text-muted-foreground">{helpBody}</div>
        </div>
      )}
    </div>
  );
}
