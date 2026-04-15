'use client';

import { useState } from 'react';
import { FolderTree, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCategories, useDeleteCategory } from '@/hooks/use-categories';
import type { Category } from '@/types/models';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories();
  const deleteMutation = useDeleteCategory();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(
    null,
  );

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setDialogOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditingCategory(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta categoria?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorias"
        subtitle="Organize receitas e despesas em categorias"
        helpTitle="Pra que servem as categorias?"
        helpBody={
          <>
            <p>
              Categorias classificam cada lançamento pra você entender pra
              onde o dinheiro está indo. No relatório do mês, você vê
              quanto foi pra <strong>Alimentação</strong>, quanto pra{' '}
              <strong>Transporte</strong>, etc.
            </p>
            <p className="pt-1">
              <strong>Exemplos de categorias de despesa:</strong> Alimentação,
              Transporte, Internet, Aluguel, Energia, Marketing, Software,
              Funcionários, Fornecedores, Impostos.
            </p>
            <p>
              <strong>Exemplos de categorias de receita:</strong> Vendas,
              Serviços, Comissões, Assinaturas, Outros.
            </p>
            <p className="pt-1">
              Quando você registrar uma despesa pelo WhatsApp (ex:{' '}
              <em>&quot;gastei 50 no uber&quot;</em>), o bot tenta casar com
              a categoria mais próxima que você tem cadastrada aqui. Por
              isso vale a pena criar 5-10 categorias que fazem sentido pro
              seu negócio.
            </p>
          </>
        }
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Categoria
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px]" />
          ))}
        </div>
      ) : categories && categories.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <Card key={cat.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-black"
                      style={{ backgroundColor: cat.color }}
                    >
                      {cat.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{cat.name}</p>
                      <Badge
                        variant={typeVariants[cat.type] ?? 'secondary'}
                        className="mt-1"
                      >
                        {typeLabels[cat.type] ?? cat.type}
                      </Badge>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(cat)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(cat.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <FolderTree className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">
            Nenhuma categoria criada
          </h3>
          <p className="mb-6 text-sm text-muted-foreground">
            Crie categorias para organizar suas transações
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Criar primeira categoria
          </Button>
        </div>
      )}

      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={handleOpenChange}
        editingCategory={editingCategory}
      />
    </div>
  );
}
