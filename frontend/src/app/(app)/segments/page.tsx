'use client';

import { useState } from 'react';
import { Plus, Tags } from 'lucide-react';
import { useSegments } from '@/hooks/use-segments';
import type { Segment } from '@/types/models';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SegmentCard } from '@/components/segments/segment-card';
import { SegmentFormDialog } from '@/components/segments/segment-form-dialog';
import { PageHeader } from '@/components/shared/page-header';

export default function SegmentsPage() {
  const { data: segments, isLoading } = useSegments();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(
    null,
  );

  const handleEdit = (segment: Segment) => {
    setEditingSegment(segment);
    setDialogOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditingSegment(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Segmentos"
        subtitle="Organize lançamentos por canal, filial ou unidade do seu negócio"
        helpTitle="Pra que servem os segmentos?"
        helpBody={
          <>
            <p>
              Segmentos são a <strong>segunda dimensão</strong> da sua
              contabilidade — enquanto categorias dizem <em>&quot;em quê&quot;</em>{' '}
              (ex: Marketing), segmentos dizem <em>&quot;de onde&quot;</em> ou{' '}
              <em>&quot;pra onde&quot;</em> (ex: Loja Física vs Shopee).
            </p>
            <p className="pt-1">
              <strong>Exemplos comuns:</strong>
            </p>
            <ul className="ml-4 list-disc space-y-0.5">
              <li>
                <strong>Canais de venda</strong>: Loja Física, Shopee, Mercado
                Livre, Instagram, WhatsApp, Site Próprio
              </li>
              <li>
                <strong>Filiais</strong>: Matriz, Filial Centro, Filial Zona
                Sul
              </li>
              <li>
                <strong>Unidades de negócio</strong>: Consultoria, Cursos,
                Produtos Físicos
              </li>
            </ul>
            <p className="pt-1">
              Com segmentos você consegue responder{' '}
              <em>&quot;quanto faturei no Mercado Livre esse mês?&quot;</em> ou{' '}
              <em>&quot;qual filial deu mais lucro?&quot;</em>. Se seu negócio
              é só um canal/local, pode pular essa parte.
            </p>
          </>
        }
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Segmento
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px]" />
          ))}
        </div>
      ) : segments && segments.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {segments.map((segment) => (
            <SegmentCard
              key={segment.id}
              segment={segment}
              onEdit={handleEdit}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Tags className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">
            Nenhum segmento criado
          </h3>
          <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
            Segmentos são opcionais e ajudam a separar suas finanças por
            canal de venda, filial ou unidade. Crie o primeiro quando
            precisar.
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Criar primeiro segmento
          </Button>
        </div>
      )}

      <SegmentFormDialog
        open={dialogOpen}
        onOpenChange={handleOpenChange}
        editingSegment={editingSegment}
      />
    </div>
  );
}
