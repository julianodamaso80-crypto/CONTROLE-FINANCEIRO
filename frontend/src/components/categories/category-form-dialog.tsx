'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
} from '@/hooks/use-categories';
import type { Category } from '@/types/models';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const presetColors = [
  '#22c55e',
  '#3b82f6',
  '#f97316',
  '#eab308',
  '#ec4899',
  '#8b5cf6',
  '#ef4444',
  '#06b6d4',
];

const iconOptions = [
  { value: 'trending-up', label: 'Tendência' },
  { value: 'briefcase', label: 'Trabalho' },
  { value: 'utensils', label: 'Alimentação' },
  { value: 'car', label: 'Transporte' },
  { value: 'megaphone', label: 'Marketing' },
  { value: 'truck', label: 'Logística' },
  { value: 'home', label: 'Casa' },
  { value: 'heart', label: 'Saúde' },
  { value: 'book', label: 'Educação' },
  { value: 'zap', label: 'Energia' },
];

const formSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome da categoria é obrigatório')
    .max(60),
  type: z.enum(['INCOME', 'EXPENSE', 'BOTH'], {
    required_error: 'Selecione o tipo',
  }),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato #RRGGBB'),
  icon: z.string().min(1),
  parentCategoryId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCategory?: Category | null;
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  editingCategory,
}: CategoryFormDialogProps) {
  const { data: categories } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const isEditing = !!editingCategory;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { color: '#22c55e', icon: 'trending-up', type: 'EXPENSE' },
  });

  const watchColor = watch('color');
  const watchType = watch('type');
  const watchIcon = watch('icon');

  useEffect(() => {
    if (editingCategory) {
      reset({
        name: editingCategory.name,
        type: editingCategory.type,
        color: editingCategory.color,
        icon: editingCategory.icon,
        parentCategoryId: editingCategory.parentCategoryId ?? '',
      });
    } else {
      reset({
        name: '',
        type: 'EXPENSE',
        color: '#22c55e',
        icon: 'trending-up',
        parentCategoryId: '',
      });
    }
  }, [editingCategory, reset]);

  const onSubmit = (data: FormValues) => {
    const payload = {
      name: data.name,
      type: data.type,
      color: data.color,
      icon: data.icon,
      parentCategoryId: data.parentCategoryId || undefined,
    };

    if (isEditing) {
      updateMutation.mutate(
        { id: editingCategory.id, data: payload },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const isPending =
    createMutation.isPending || updateMutation.isPending;

  // Filtra categorias pra não mostrar a própria como pai
  const parentOptions =
    categories?.filter((c) => c.id !== editingCategory?.id) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Categoria' : 'Nova Categoria'}
          </DialogTitle>
          <DialogDescription>
            Categorias organizam suas receitas e despesas
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              placeholder="Ex: Alimentação, Marketing"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={watchType}
              onValueChange={(v) =>
                setValue('type', v as FormValues['type'])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCOME">Receita</SelectItem>
                <SelectItem value="EXPENSE">Despesa</SelectItem>
                <SelectItem value="BOTH">Ambos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {presetColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`h-8 w-8 rounded-full border-2 transition-transform ${
                    watchColor === color
                      ? 'scale-110 border-white'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setValue('color', color)}
                />
              ))}
              <Input
                className="h-8 w-24"
                value={watchColor}
                onChange={(e) => setValue('color', e.target.value)}
                maxLength={7}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ícone</Label>
            <Select
              value={watchIcon}
              onValueChange={(v) => setValue('icon', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {iconOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Categoria pai (opcional)</Label>
            <Select
              value={watch('parentCategoryId') || '__none__'}
              onValueChange={(v) =>
                setValue('parentCategoryId', v === '__none__' ? undefined : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Nenhuma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhuma</SelectItem>
                {parentOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
