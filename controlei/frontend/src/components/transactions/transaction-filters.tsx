'use client';

import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useSegments } from '@/hooks/use-segments';
import { useCategories } from '@/hooks/use-categories';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Filters {
  type?: string;
  status?: string;
  segmentId?: string;
  categoryId?: string;
  search?: string;
}

interface TransactionFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export function TransactionFilters({
  filters,
  onChange,
}: TransactionFiltersProps) {
  const { data: segments } = useSegments();
  const { data: categories } = useCategories();
  const [searchInput, setSearchInput] = useState(filters.search ?? '');

  // Debounce da busca textual
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== (filters.search ?? '')) {
        onChange({ ...filters, search: searchInput || undefined });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilters =
    filters.type || filters.status || filters.segmentId || filters.categoryId || filters.search;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          value={filters.type ?? 'all'}
          onValueChange={(v) =>
            onChange({
              ...filters,
              type: v === 'all' ? undefined : v,
            })
          }
        >
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="INCOME">Receitas</TabsTrigger>
            <TabsTrigger value="EXPENSE">Despesas</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select
          value={filters.status ?? '__all__'}
          onValueChange={(v) =>
            onChange({ ...filters, status: v === '__all__' ? undefined : v })
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            <SelectItem value="PENDING">Pendente</SelectItem>
            <SelectItem value="PAID">Pago</SelectItem>
            <SelectItem value="OVERDUE">Vencido</SelectItem>
            <SelectItem value="CANCELLED">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.segmentId ?? '__all__'}
          onValueChange={(v) =>
            onChange({ ...filters, segmentId: v === '__all__' ? undefined : v })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Segmento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            {segments?.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.categoryId ?? '__all__'}
          onValueChange={(v) =>
            onChange({ ...filters, categoryId: v === '__all__' ? undefined : v })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar transações..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput('');
              onChange({});
            }}
          >
            <X className="mr-1 h-4 w-4" />
            Limpar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
