'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { X, Plus } from 'lucide-react';
import { useCreateSegment } from '@/hooks/use-segments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const ONBOARDED_KEY = 'finnix_onboarded';

const suggestedSegments = [
  'Loja Física',
  'Shopee',
  'Mercado Livre',
  'Instagram',
  'WhatsApp',
  'Matriz',
  'Filial',
];

type Step = 'welcome' | 'ask-segments' | 'create-segments' | 'no-segments' | 'done';

export function OnboardingDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('welcome');
  const [segmentNames, setSegmentNames] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const createSegment = useCreateSegment();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const onboarded = localStorage.getItem(ONBOARDED_KEY);
      if (!onboarded) {
        setOpen(true);
      }
    }
  }, []);

  const addSegment = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !segmentNames.includes(trimmed)) {
      setSegmentNames([...segmentNames, trimmed]);
    }
    setInputValue('');
  };

  const removeSegment = (name: string) => {
    setSegmentNames(segmentNames.filter((s) => s !== name));
  };

  const handleSaveSegments = async () => {
    setIsSaving(true);
    let created = 0;
    let skipped = 0;
    for (const name of segmentNames) {
      try {
        await createSegment.mutateAsync({ name });
        created++;
      } catch {
        // Segmento já existe (duplicado) — ignora e continua
        skipped++;
      }
    }
    if (created > 0) {
      toast.success(`${created} segmento${created > 1 ? 's' : ''} criado${created > 1 ? 's' : ''} com sucesso!`);
    }
    if (skipped > 0) {
      toast.info(`${skipped} segmento${skipped > 1 ? 's' : ''} já existia${skipped > 1 ? 'm' : ''} e foi${skipped > 1 ? 'ram' : ''} ignorado${skipped > 1 ? 's' : ''}.`);
    }
    setIsSaving(false);
    setStep('done');
  };

  const finish = () => {
    localStorage.setItem(ONBOARDED_KEY, 'true');
    setOpen(false);
    router.push('/dashboard');
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-[500px]"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {step === 'welcome' && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">
                Bem-vindo ao Finnix!
              </DialogTitle>
              <DialogDescription className="text-base">
                Antes de começar, queremos entender como seu negócio
                funciona pra configurar do jeito certo pra você.
              </DialogDescription>
            </DialogHeader>
            <Button className="mt-4" onClick={() => setStep('ask-segments')}>
              Começar
            </Button>
          </>
        )}

        {step === 'ask-segments' && (
          <>
            <DialogHeader>
              <DialogTitle>
                Seu negócio tem mais de um canal de venda, loja ou filial?
              </DialogTitle>
              <DialogDescription className="text-base">
                Exemplos: loja física + Shopee, duas filiais em cidades
                diferentes, vendas pelo Instagram + WhatsApp + Mercado
                Livre, ou um negócio único sem divisões.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex gap-3">
              <Button
                className="flex-1"
                onClick={() => setStep('create-segments')}
              >
                Sim, tenho mais de um
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep('no-segments')}
              >
                Não, é tudo junto
              </Button>
            </div>
          </>
        )}

        {step === 'create-segments' && (
          <>
            <DialogHeader>
              <DialogTitle>
                Vamos cadastrar seus canais/filiais
              </DialogTitle>
              <DialogDescription>
                Adicione os canais que fazem sentido pro seu negócio
              </DialogDescription>
            </DialogHeader>

            <div className="mt-2 space-y-4">
              {/* Sugestões */}
              <div className="flex flex-wrap gap-2">
                {suggestedSegments
                  .filter((s) => !segmentNames.includes(s))
                  .map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="rounded-full border px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      onClick={() => addSegment(s)}
                    >
                      + {s}
                    </button>
                  ))}
              </div>

              {/* Input manual */}
              <div className="flex gap-2">
                <Input
                  placeholder="Nome do canal/filial"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSegment(inputValue);
                    }
                  }}
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => addSegment(inputValue)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Lista */}
              {segmentNames.length > 0 && (
                <div className="space-y-2">
                  {segmentNames.map((name) => (
                    <div
                      key={name}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <span className="text-sm">{name}</span>
                      <button
                        type="button"
                        onClick={() => removeSegment(name)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                className="w-full"
                disabled={segmentNames.length === 0 || isSaving}
                onClick={handleSaveSegments}
              >
                {isSaving
                  ? 'Salvando...'
                  : `Salvar ${segmentNames.length} segmento${segmentNames.length > 1 ? 's' : ''} e continuar`}
              </Button>
            </div>
          </>
        )}

        {step === 'no-segments' && (
          <>
            <DialogHeader>
              <DialogTitle>Perfeito!</DialogTitle>
              <DialogDescription className="text-base">
                Vamos manter tudo simples. Você pode ativar segmentos
                depois se mudar de ideia.
              </DialogDescription>
            </DialogHeader>
            <Button className="mt-4" onClick={() => setStep('done')}>
              Continuar
            </Button>
          </>
        )}

        {step === 'done' && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">
                Tudo pronto!
              </DialogTitle>
              <DialogDescription className="text-base">
                Explore o Finnix. Sugestão do que fazer a seguir:
              </DialogDescription>
            </DialogHeader>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-muted-foreground">
              <li>Crie suas primeiras categorias</li>
              <li>Cadastre suas contas bancárias</li>
              <li>Registre sua primeira transação</li>
            </ol>
            <Button className="mt-4" onClick={finish}>
              Ir para o dashboard
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
