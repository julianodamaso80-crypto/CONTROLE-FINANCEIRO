'use client';

import { useState } from 'react';
import { Plus, Users as UsersIcon, Trash2, Shield, Phone, Mail } from 'lucide-react';
import { useUsers, useCreateUser, useDeleteUser, useUpdateUser } from '@/hooks/use-users';
import type { User, UserRole } from '@/types/models';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'ADMIN', label: 'Admin', description: 'Acesso total — pode gerenciar membros, configurações e dados' },
  { value: 'FINANCE', label: 'Financeiro', description: 'Vê e edita transações, mas não mexe em configurações' },
  { value: 'USER', label: 'Usuário', description: 'Pode lançar e ver as próprias transações' },
];

export default function TeamPage() {
  const { data: users, isLoading } = useUsers();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipe / Membros"
        subtitle="Adicione pessoas pra gerenciar as finanças junto com você"
        helpTitle="Como funciona a gestão compartilhada?"
        helpBody={
          <>
            <p>
              Você pode adicionar membros (sócio, contador, esposa(o), assistente).
              Cada membro entra com o próprio email e senha.
            </p>
            <p>
              <strong>Cada membro tem seu próprio WhatsApp cadastrado</strong> —
              quando alguém manda mensagem do número dele(a), o bot reconhece e
              registra a transação em nome dessa pessoa.
            </p>
            <p>
              <strong>Perfis (roles):</strong>
            </p>
            <ul className="ml-4 list-disc space-y-0.5">
              <li><strong>Admin</strong> — pode tudo, inclusive gerenciar membros</li>
              <li><strong>Financeiro</strong> — vê e edita transações, sem mexer em config</li>
              <li><strong>Usuário</strong> — só lança e vê as próprias transações</li>
            </ul>
          </>
        }
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar membro
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px]" />
          ))}
        </div>
      ) : users && users.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {users.map((u) => (
            <UserCard key={u.id} user={u} />
          ))}
        </div>
      ) : (
        <EmptyState onCreate={() => setOpen(true)} />
      )}

      <UserFormDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function UserCard({ user }: { user: User }) {
  const del = useDeleteUser();
  const update = useUpdateUser();

  const roleBadge: Record<UserRole, string> = {
    ADMIN: 'bg-purple-500/20 text-purple-400',
    FINANCE: 'bg-blue-500/20 text-blue-400',
    USER: 'bg-gray-500/20 text-gray-400',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{user.name}</p>
                {!user.isActive && (
                  <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>
                )}
              </div>
              <Badge className={roleBadge[user.role] ?? ''}>{user.role}</Badge>
            </div>
          </div>
          {user.isActive && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => del.mutate(user.id)}
              title="Desativar"
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
        {user.isActive && (
          <div className="mt-3 flex items-center gap-2">
            <Select
              value={user.role}
              onValueChange={(v) => update.mutate({ id: user.id, data: { role: v } })}
            >
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              {ROLES.find((r) => r.value === user.role)?.description}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
      <UsersIcon className="mb-4 h-12 w-12 text-muted-foreground" />
      <h3 className="mb-2 text-lg font-medium">Você é o único membro</h3>
      <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
        Adicione sócio, contador, cônjuge ou assistente. Cada membro entra com
        sua própria senha e cadastra transações pelo próprio WhatsApp.
      </p>
      <Button onClick={onCreate}>
        <Plus className="mr-2 h-4 w-4" /> Adicionar primeiro membro
      </Button>
    </div>
  );
}

function UserFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const create = useCreateUser();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('USER');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await create.mutateAsync({ name, email, phone, password, role });
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setRole('USER');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar membro</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome completo</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="11 99999-0000"
                required
              />
            </div>
          </div>
          <div>
            <Label>Senha temporária (mín 8)</Label>
            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="O membro pode alterar depois"
            />
          </div>
          <div>
            <Label>Perfil</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <span className="flex items-center gap-2">
                      <Shield className="h-3 w-3" />
                      {r.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              {ROLES.find((r) => r.value === role)?.description}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Salvando...' : 'Adicionar membro'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
