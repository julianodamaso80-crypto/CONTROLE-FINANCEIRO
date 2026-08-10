'use client';

import { useState } from 'react';
import { Plus, UserPlus, Trash2, Phone, Mail, Crown, MessageCircle, Copy } from 'lucide-react';
import { useUsers, useCreateUser, useDeleteUser } from '@/hooks/use-users';
import { useIsOwner } from '@/hooks/use-company';
import type { User } from '@/types/models';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';

export default function TeamPage() {
  const { data: users, isLoading } = useUsers();
  const { isOwner } = useIsOwner();
  const [open, setOpen] = useState(false);

  const active = (users ?? []).filter((u) => u.isActive);
  const hasMember = active.length > 1;
  const canInvite = isOwner && !hasMember;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conta compartilhada"
        subtitle="Divida as contas da casa com mais uma pessoa"
        helpTitle="Como funciona a conta compartilhada?"
        helpBody={
          <>
            <p>
              Você pode convidar <strong>mais uma pessoa</strong> para usar a mesma
              conta — cônjuge, filho(a), quem divide as despesas com você. É o mesmo
              plano, sem custo extra.
            </p>
            <p>
              <strong>As despesas somam.</strong> Se você lança R$ 10 e a outra pessoa
              lança R$ 50, a conta mostra R$ 60. Não são dois controles separados, é
              o mesmo caixa da casa.
            </p>
            <p>
              <strong>Cada lançamento fica com o nome de quem fez</strong>, e você pode
              filtrar por pessoa na tela de Lançamentos para ver quem gastou o quê.
            </p>
            <p>
              <strong>Cada um usa o próprio WhatsApp.</strong> A pessoa convidada manda
              &quot;mercado 60&quot; do celular dela e o lançamento entra aqui já no
              nome dela.
            </p>
            <p>
              Os dois veem e editam tudo. Só o dono da conta pode convidar ou remover
              o membro e mexer no plano.
            </p>
          </>
        }
        actions={
          canInvite ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Convidar pessoa
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-[130px]" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {active.map((u) => (
              <PersonCard key={u.id} user={u} canManage={isOwner} />
            ))}
            {!hasMember && (
              <EmptySlot canInvite={canInvite} isOwner={isOwner} onInvite={() => setOpen(true)} />
            )}
          </div>

          {hasMember && (
            <p className="text-sm text-muted-foreground">
              Sua conta está completa: 2 pessoas.{' '}
              {isOwner
                ? 'Para trocar de pessoa, remova o membro atual e convide outro.'
                : 'Só o dono da conta pode alterar isso.'}
            </p>
          )}
        </>
      )}

      <InviteDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function PersonCard({ user, canManage }: { user: User; canManage: boolean }) {
  const del = useDeleteUser();

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{user.name}</p>
              {user.isOwner ? (
                <Badge className="mt-0.5 bg-amber-500/20 text-amber-400">
                  <Crown className="mr-1 h-3 w-3" /> Dono da conta
                </Badge>
              ) : (
                <Badge className="mt-0.5 bg-emerald-500/20 text-emerald-400">Membro</Badge>
              )}
            </div>
          </div>
          {canManage && !user.isOwner && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (confirm(`Remover ${user.name} da conta? Os lançamentos já feitos continuam aqui.`)) {
                  del.mutate(user.id);
                }
              }}
              title="Remover da conta"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {user.email}</p>
          {user.phone && (
            <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {user.phone}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptySlot({
  canInvite,
  isOwner,
  onInvite,
}: {
  canInvite: boolean;
  isOwner: boolean;
  onInvite: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
      <UserPlus className="mb-3 h-8 w-8 text-muted-foreground" />
      <h3 className="mb-1 font-medium">Vaga livre</h3>
      <p className="mb-4 max-w-xs text-sm text-muted-foreground">
        {isOwner
          ? 'Convide quem divide as contas com você. Mesmo plano, sem custo a mais.'
          : 'Só o dono da conta pode convidar outra pessoa.'}
      </p>
      {canInvite && (
        <Button onClick={onInvite} variant="outline">
          <Plus className="mr-2 h-4 w-4" /> Convidar pessoa
        </Button>
      )}
    </div>
  );
}

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const create = useCreateUser();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  // Credenciais mostradas depois de convidar: a senha não pode ir no WhatsApp
  // (regra do Meta), então quem convidou precisa repassar.
  const [created, setCreated] = useState<{ name: string; email: string; password: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await create.mutateAsync({ name, email, phone, password });
    setCreated({ name, email, password });
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
  };

  const close = () => {
    setCreated(null);
    onOpenChange(false);
  };

  if (created) {
    const firstName = created.name.split(' ')[0];
    const texto =
      `Oi ${firstName}! Te adicionei na nossa conta do Controlei pra gente organizar as despesas junto.\n\n` +
      `Entra em controlei.ia.br\n` +
      `Email: ${created.email}\n` +
      `Senha provisória: ${created.password}\n\n` +
      `No primeiro acesso ele pede pra você criar sua própria senha.`;

    return (
      <Dialog open={open} onOpenChange={close}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{firstName} já faz parte da conta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Avisamos {firstName} no WhatsApp. Por segurança, a senha não vai por
              lá — mande você mesmo:
            </p>
            <pre className="whitespace-pre-wrap rounded-md bg-muted/60 p-3 text-xs">
              {texto}
            </pre>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                void navigator.clipboard.writeText(texto);
              }}
            >
              <Copy className="mr-2 h-4 w-4" /> Copiar mensagem
            </Button>
          </div>
          <DialogFooter>
            <Button type="button" onClick={close}>Pronto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar pessoa para a conta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Email de acesso</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>WhatsApp da pessoa</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="11 99999-0000"
                required
              />
            </div>
          </div>
          <div>
            <Label>Senha provisória (mín 8)</Label>
            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Passe essa senha pra pessoa"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Ela vai trocar por uma senha própria no primeiro acesso.
            </p>
          </div>
          <div className="flex gap-2 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            <MessageCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Use o WhatsApp pessoal dela — avisamos por lá que ela entrou na
              conta, e é por esse número que o Controlei reconhece os lançamentos
              que ela mandar.
            </span>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Convidando...' : 'Convidar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
