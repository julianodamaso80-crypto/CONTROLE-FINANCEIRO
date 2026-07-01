'use client';

import { useState } from 'react';
import { KeyRound, Loader2, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';

/**
 * Bloqueio de 1º acesso: se a conta foi criada pelo admin com senha provisória
 * (mustChangePassword), obriga a trocar a senha antes de usar o sistema.
 * Renderizado nos layouts autenticados — cobre cliente, influencer e admin.
 */
export function ForcePasswordChange() {
  const { user, updateUser, logout } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user?.mustChangePassword) return null;

  const submit = async () => {
    if (password.length < 6) {
      toast.error('A nova senha precisa ter no mínimo 6 caracteres');
      return;
    }
    if (password !== confirm) {
      toast.error('As senhas não conferem');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/change-password', { newPassword: password });
      updateUser({ mustChangePassword: false });
      toast.success('Senha alterada! Bem-vindo(a).');
    } catch (e: unknown) {
      // O interceptor do axios (lib/api) já coloca a mensagem do backend em e.message
      toast.error(
        e instanceof Error && e.message
          ? e.message
          : 'Não foi possível alterar a senha',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border-2 bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
            <KeyRound className="h-5 w-5 text-primary" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-foreground">
              Crie sua senha
            </h2>
            <p className="text-sm font-semibold text-foreground/70">
              Por segurança, defina uma senha nova pra continuar.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-bold text-foreground">
              Nova senha
            </label>
            <input
              type="password"
              value={password}
              autoFocus
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Mínimo 6 caracteres"
              className="mt-1.5 w-full rounded-md border-2 bg-background px-3 py-2.5 text-sm font-semibold text-foreground placeholder:font-medium placeholder:text-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-foreground">
              Confirmar nova senha
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Repita a senha"
              className="mt-1.5 w-full rounded-md border-2 bg-background px-3 py-2.5 text-sm font-semibold text-foreground placeholder:font-medium placeholder:text-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="gap-2 text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
          <Button onClick={submit} disabled={loading} className="font-bold">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Salvar e continuar'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
