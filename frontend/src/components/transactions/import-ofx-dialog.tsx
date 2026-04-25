'use client';

import { useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBankAccounts } from '@/hooks/use-bank-accounts';
import { useCategories } from '@/hooks/use-categories';
import { formatCurrency, formatDate } from '@/lib/utils';

interface OfxPreviewItem {
  index: number;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  date: string;
  description: string;
  fitId: string;
  duplicate: boolean;
}

interface OfxPreviewResult {
  totalCount: number;
  duplicateCount: number;
  items: OfxPreviewItem[];
  bankId?: string;
  accountId?: string;
}

export function ImportOfxDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<OfxPreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [bankAccountId, setBankAccountId] = useState('');
  const [defaultCategoryId, setDefaultCategoryId] = useState('');
  const [skipped, setSkipped] = useState<Set<number>>(new Set());

  const { data: accounts } = useBankAccounts();
  const { data: categories } = useCategories();
  const qc = useQueryClient();

  const reset = () => {
    setFile(null);
    setPreview(null);
    setBankAccountId('');
    setDefaultCategoryId('');
    setSkipped(new Set());
  };

  const handlePreview = async () => {
    if (!file) return;
    setPreviewing(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/imports/ofx/preview', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data: OfxPreviewResult = res.data.data;
      setPreview(data);
      // Pré-marca duplicatas como puladas
      setSkipped(new Set(data.items.filter((i) => i.duplicate).map((i) => i.index)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao ler OFX');
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!file || !preview) return;
    setImporting(true);
    try {
      const selections = preview.items
        .filter((i) => !skipped.has(i.index))
        .map((i) => ({
          index: i.index,
          bankAccountId: bankAccountId || undefined,
          categoryId: defaultCategoryId || undefined,
        }));

      const fd = new FormData();
      fd.append('file', file);
      fd.append('selections', JSON.stringify(selections));
      const res = await api.post('/imports/ofx', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { imported, skipped: skp } = res.data.data;
      toast.success(`Importadas ${imported} transações${skp ? ` (${skp} puladas)` : ''}`);
      void qc.invalidateQueries({ queryKey: ['transactions'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      reset();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao importar');
    } finally {
      setImporting(false);
    }
  };

  const toggleSkip = (index: number) => {
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload className="mr-2 h-4 w-4" /> Importar OFX
      </Button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Importar extrato OFX</DialogTitle>
          </DialogHeader>

          {!preview ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-dashed p-6 text-center">
                <FileText className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
                <input
                  type="file"
                  accept=".ofx"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="block w-full cursor-pointer text-sm text-muted-foreground file:mr-4 file:rounded file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:opacity-90"
                />
                {file && (
                  <p className="mt-2 text-sm">
                    <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Suportamos arquivos OFX gerados por bancos como Bradesco, Itaú,
                Nubank, Caixa e outros. Detectamos duplicatas automaticamente.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handlePreview} disabled={!file || previewing}>
                  {previewing ? 'Lendo...' : 'Pré-visualizar'}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/30 p-3 text-sm">
                <div>
                  <strong>{preview.totalCount}</strong> transações encontradas
                </div>
                <div>
                  <strong className="text-amber-400">{preview.duplicateCount}</strong> possíveis duplicatas
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">Conta bancária</label>
                  <Select value={bankAccountId} onValueChange={setBankAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {(accounts ?? []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm">Categoria padrão (opcional)</label>
                  <Select value={defaultCategoryId} onValueChange={setDefaultCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sem categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {(categories ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="max-h-[300px] overflow-y-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/40">
                    <tr>
                      <th className="p-2 text-left">Importar?</th>
                      <th className="p-2 text-left">Data</th>
                      <th className="p-2 text-left">Descrição</th>
                      <th className="p-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.items.map((item) => {
                      const willImport = !skipped.has(item.index);
                      return (
                        <tr
                          key={item.index}
                          className={item.duplicate ? 'bg-amber-500/5' : ''}
                        >
                          <td className="p-2">
                            <input
                              type="checkbox"
                              checked={willImport}
                              onChange={() => toggleSkip(item.index)}
                              className="h-4 w-4"
                            />
                          </td>
                          <td className="p-2 whitespace-nowrap">
                            {formatDate(item.date)}
                          </td>
                          <td className="p-2">
                            {item.description}
                            {item.duplicate && (
                              <span className="ml-2 text-xs text-amber-400">(duplicata?)</span>
                            )}
                          </td>
                          <td
                            className={`p-2 text-right font-medium ${item.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}
                          >
                            {item.type === 'INCOME' ? '+' : '-'} {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setPreview(null)}>Voltar</Button>
                <Button onClick={handleImport} disabled={importing}>
                  {importing
                    ? 'Importando...'
                    : `Importar ${preview.items.length - skipped.size} transações`}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
