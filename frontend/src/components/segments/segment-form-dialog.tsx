'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateSegment, useUpdateSegment } from '@/hooks/use-segments';
import type { Segment } from '@/types/models';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  '#8DFF6B',
  '#FF6B9D',
  '#FFB86B',
  '#6BB5FF',
  '#B56BFF',
  '#FF6B6B',
  '#6BFFD4',
  '#FFE66B',
];

const iconOptions = [
  { value: 'tag', label: 'Tag' },
  { value: 'store', label: 'Loja' },
  { value: 'shopping-bag', label: 'Sacola' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'building', label: 'Empresa' },
  { value: 'map-pin', label: 'Local' },
  { value: 'briefcase', label: 'Trabalho' },
  { value: 'package', label: 'Pacote' },
  { value: 'truck', label: 'Entrega' },
  { value: 'users', label: 'Equipe' },
];

const formSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome do segmento é obrigatório')
    .max(60, 'Nome deve ter no máximo 60 caracteres'),
  description: z.string().max(255).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato #RRGGBB'),
  icon: z.string().min(1),
});

type FormValues = z.infer<typeof formSchema>;

interface SegmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSegment?: Segment | null;
}

export function SegmentFormDialog({
  open,
  onOpenChange,
  editingSegment,
}: SegmentFormDialogProps) {
  const createMutation = useCreateSegment();
  const updateMutation = useUpdateSegment();
  const isEditing = !!editingSegment;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { color: '#8DFF6B', icon: 'tag' },
  });

  const watchColor = watch('color');
  const watchName = watch('name');
  const watchIcon = watch('icon');

  useEffect(() => {
    if (editingSegment) {
      reset({
        name: editingSegment.name,
        description: editingSegment.description ?? '',
        color: editingSegment.color,
        icon: editingSegment.icon,
      });
    } else {
      reset({ name: '', description: '', color: '#8DFF6B', icon: 'tag' });
    }
  }, [editingSegment, reset]);

  const onSubmit = (data: FormValues) => {
    const payload = {
      name: data.name,
      description: data.description || undefined,
      color: data.color,
      icon: data.icon,
    };

    if (isEditing) {
      updateMutation.mutate(
        { id: editingSegment.id, data: payload },
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Segmento' : 'Novo Segmento'}
          </DialogTitle>
          <DialogDescription>
            Segmentos ajudam a organizar transações por canal, filial ou
            unidade
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              placeholder="Ex: Loja Física, Shopee, Instagram"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Uma breve descrição do segmento"
              {...register('description')}
            />
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
            {errors.color && (
              <p className="text-sm text-destructive">
                {errors.color.message}
              </p>
            )}
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

          {/* Preview */}
          <div className="rounded-lg border p-4">
            <p className="mb-2 text-xs uppercase text-muted-foreground">
              Preview
            </p>
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-black"
                style={{ backgroundColor: watchColor }}
              >
                {(watchName ?? '?').charAt(0).toUpperCase()}
              </div>
              <span className="font-medium">{watchName || 'Segmento'}</span>
            </div>
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
