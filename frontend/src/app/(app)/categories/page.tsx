'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FolderTree,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useCategories, useDeleteCategory } from '@/hooks/use-categories';
import type { Category } from '@/types/models';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CategoryFormDialog } from '@/components/categories/category-form-dialog';
import { PageHeader } from '@/components/shared/page-header';

const typeLabels: Record<string, string> = {
  INCOME: 'Receita',
  EXPENSE: 'Despesa',
  BOTH: 'Ambos',
};

const typeVariants: Record<string, 'success' | 'destructive' | 'secondary'> = {
  INCOME: 'success',
  EXPENSE: 'destructive',
  BOTH: 'secondary',
};

function CategoryRow({
  cat,
  isChild,
  onEdit,
  onDelete,
  onAddChild,
}: {
  cat: Category;
  isChild?: boolean;
  onEdit: (c: Category) => void;
  onDelete: (id: string) => void;
  onAddChild?: (parentId: string) => void;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-md border px-4 py-3 ${
        isChild ? 'ml-8 border-dashed' : ''
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold text-black"
          style={{ backgroundColor: cat.color }}
        >
          {cat.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{cat.name}</p>
          {isChild && cat.parent && (
            <p className="truncate text-xs text-muted-foreground">
              dentro de {cat.parent.name}
            </p>
          )}
        </div>
        <Badge
          variant={typeVariants[cat.type] ?? 'secondary'}
          className="shrink-0"
        >
          {typeLabels[cat.type] ?? cat.type}
        </Badge>
      </div>

      <div className="flex items-center gap-1">
        {!isChild && onAddChild && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Adicionar subcategoria"
            onClick={() => onAddChild(cat.id)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(cat)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(cat.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function CategoryGroup({
  parent,
  children,
  onEdit,
  onDelete,
  onAddChild,
}: {
  parent: Category;
  children: Category[];
  onEdit: (c: Category) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="space-y-1">
      <button
        type="button"
        className="flex w-full items-center gap-1 text-left"
        onClick={() => children.length > 0 && setExpanded((v) => !v)}
      >
        {children.length > 0 ? (
          expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )
        ) : (
          <div className="w-4" />
        )}
        <div className="flex-1">
          <CategoryRow
            cat={parent}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
          />
        </div>
      </button>

      {expanded &&
        children.map((child) => (
          <CategoryRow
            key={child.id}
            cat={child}
            isChild
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
    </div>
  );
}

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories();
  const deleteMutation = useDeleteCategory();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | undefined>();

  const handleEdit = (category: Category) => {
    setDefaultParentId(undefined);
    setEditingCategory(category);
    setDialogOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingCategory(null);
      setDefaultParentId(undefined);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta categoria?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleAddChild = (parentId: string) => {
    setEditingCategory(null);
    setDefaultParentId(parentId);
    setDialogOpen(true);
  };

  const handleNewCategory = () => {
    setDefaultParentId(undefined);
    setEditingCategory(null);
    setDialogOpen(true);
  };

  // Organiza em árvore: pais (sem parent) + filhos agrupados
  const parents = categories?.filter((c) => !c.parentCategoryId) ?? [];
  const childrenMap = new Map<string, Category[]>();
  categories
    ?.filter((c) => c.parentCategoryId)
    .forEach((c) => {
      const key = c.parentCategoryId!;
      const arr = childrenMap.get(key) ?? [];
      arr.push(c);
      childrenMap.set(key, arr);
    });

  // Separa por tipo pra organizar melhor
  const expenseParents = parents.filter(
    (c) => c.type === 'EXPENSE' || c.type === 'BOTH',
  );
  const incomeParents = parents.filter(
    (c) => c.type === 'INCOME' || c.type === 'BOTH',
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorias"
        subtitle="Organize receitas e despesas com categorias pai e subcategorias"
        helpTitle="Como funciona a hierarquia?"
        helpBody={
          <>
            <p>
              <strong>Categorias pai</strong> agrupam o geral (ex: Insumos,
              Tributos, Despesas Fixas).{' '}
              <strong>Subcategorias</strong> detalham (ex: Bobina, Tinta
              dentro de Insumos).
            </p>
            <p className="pt-1">
              No relatório, o gráfico de pizza mostra as categorias pai.
              Ao clicar, você vê o detalhamento por subcategoria. No
              WhatsApp, o bot reconhece:{' '}
              <em>&quot;comprei bobina 500&quot;</em> → Insumos {'>'} Bobina.
            </p>
            <p className="pt-1">
              Use o botão <strong>+</strong> ao lado de uma categoria
              pai pra adicionar subcategorias rapidamente.
            </p>
          </>
        }
        actions={
          <Button onClick={handleNewCategory}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Categoria
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[56px]" />
          ))}
        </div>
      ) : categories && categories.length > 0 ? (
        <div className="space-y-8">
          {/* Despesas */}
          {expenseParents.length > 0 && (
            <div className="space-y-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                Despesas
              </h2>
              <div className="space-y-2">
                {expenseParents.map((parent) => (
                  <CategoryGroup
                    key={parent.id}
                    parent={parent}
                    children={childrenMap.get(parent.id) ?? []}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onAddChild={handleAddChild}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Receitas */}
          {incomeParents.length > 0 && (
            <div className="space-y-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                Receitas
              </h2>
              <div className="space-y-2">
                {incomeParents.map((parent) => (
                  <CategoryGroup
                    key={parent.id}
                    parent={parent}
                    children={childrenMap.get(parent.id) ?? []}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onAddChild={handleAddChild}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <FolderTree className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">
            Nenhuma categoria criada
          </h3>
          <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
            Crie categorias pra organizar suas transações. O sistema já
            cria as mais comuns no cadastro, mas você pode personalizar.
          </p>
          <Button onClick={handleNewCategory}>
            <Plus className="mr-2 h-4 w-4" />
            Criar primeira categoria
          </Button>
        </div>
      )}

      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={handleOpenChange}
        editingCategory={editingCategory}
        defaultParentId={defaultParentId}
      />
    </div>
  );
}
