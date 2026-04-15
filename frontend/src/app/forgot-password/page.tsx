'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import api from '@/lib/api';
import { FinnixLogo } from '@/components/shared/finnix-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Step = 'phone' | 'code';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { phone });
      toast.success('Código enviado! Confira seu WhatsApp.');
      setStep('code');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao solicitar código',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres');
      return;
    }
    if (code.length !== 6) {
      toast.error('O código deve ter 6 dígitos');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/auth/reset-password', { phone, code, newPassword });
      toast.success('Senha alterada! Faça login com a nova senha.');
      router.push('/login');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Código inválido ou expirado',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <FinnixLogo size="lg" />
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              {step === 'phone' ? 'Recuperar senha' : 'Digite o código'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {step === 'phone' ? (
              <form onSubmit={handleRequestCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">WhatsApp cadastrado</Label>
                  <Input
                    id="phone"
                    placeholder="(21) 99999-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Vamos enviar um código de 6 dígitos para esse WhatsApp.
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Enviando...' : 'Enviar código'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Código (6 dígitos)</Label>
                  <Input
                    id="code"
                    placeholder="000000"
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    inputMode="numeric"
                    maxLength={6}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    O código foi enviado para o seu WhatsApp e expira em 10 minutos.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova senha</Label>
                  <PasswordInput
                    id="newPassword"
                    placeholder="Mínimo 8 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Alterando...' : 'Alterar senha'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setStep('phone');
                    setCode('');
                    setNewPassword('');
                  }}
                >
                  Voltar
                </Button>
              </form>
            )}

            <p className="mt-4 text-center text-sm text-muted-foreground">
              <Link href="/login" className="text-primary hover:underline">
                Voltar para o login
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
