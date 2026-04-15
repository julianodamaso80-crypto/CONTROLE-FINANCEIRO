'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/providers/auth-provider';
import { FinnixLogo } from '@/components/shared/finnix-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const registerSchema = z.object({
  companyName: z
    .string()
    .min(2, 'Nome da empresa deve ter no mínimo 2 caracteres')
    .max(120, 'Nome da empresa deve ter no máximo 120 caracteres'),
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres'),
  phone: z
    .string()
    .min(1, 'WhatsApp é obrigatório')
    .refine(
      (v) => {
        const digits = v.replace(/\D/g, '');
        return digits.length === 10 || digits.length === 11 || (digits.startsWith('55') && (digits.length === 12 || digits.length === 13));
      },
      'Informe um WhatsApp válido com DDD',
    ),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { register: authRegister } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsSubmitting(true);
    try {
      await authRegister(data);
      toast.success('Conta criada com sucesso!');
      router.push('/dashboard');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao criar conta',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <FinnixLogo size="lg" variant="auth" />
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Criar conta no Meu Caixa</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nome da empresa</Label>
                <Input
                  id="companyName"
                  placeholder="Minha Empresa LTDA"
                  {...register('companyName')}
                />
                {errors.companyName && (
                  <p className="text-sm text-destructive">
                    {errors.companyName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Seu nome</Label>
                <Input
                  id="name"
                  placeholder="João Silva"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <PasswordInput
                  id="password"
                  placeholder="Mínimo 8 caracteres"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp</Label>
                <Input
                  id="phone"
                  placeholder="(21) 99999-0000"
                  {...register('phone')}
                />
                <p className="text-xs text-muted-foreground">
                  Você receberá uma mensagem de boas-vindas nesse número e poderá
                  registrar despesas/receitas pelo WhatsApp.
                </p>
                {errors.phone && (
                  <p className="text-sm text-destructive">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Criando conta...' : 'Cadastrar'}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Já tem conta?{' '}
              <Link
                href="/login"
                className="text-primary hover:underline"
              >
                Entre
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
