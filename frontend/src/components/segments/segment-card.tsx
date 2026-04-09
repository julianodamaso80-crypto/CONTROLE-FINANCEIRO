import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useDeleteSegment } from '@/hooks/use-segments';
import type { Segment } from '@/types/models';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SegmentCardProps {
  segment: Segment;
  onEdit: (segment: Segment) => void;
}

export function SegmentCard({ segment, onEdit }: SegmentCardProps) {
  const deleteMutation = useDeleteSegment();
  const txCount = segment._count?.transactions ?? 0;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-black"
              style={{ backgroundColor: segment.color }}
            >
              {segment.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium">{segment.name}</p>
              {segment.description && (
                <p className="text-sm text-muted-foreground">
                  {segment.description}
                </p>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(segment)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => deleteMutation.mutate(segment.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Desativar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4">
          <Badge variant="secondary">{txCount} transações</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
