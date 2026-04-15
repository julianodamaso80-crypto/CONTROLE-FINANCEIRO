'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/providers/auth-provider';
import api from '@/lib/api';
import { setUser as saveUser } from '@/lib/auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ApiResponse } from '@/types/api';
import type { Company, User } from '@/types/models';

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  // Perfil
  const [profile, setProfile] = useState({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Senha
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);

  // Empresa
  const [company, setCompany] = useState<Company | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);

  useEffect(() => {
    api
      .get<ApiResponse<Company>>('/companies/me')
      .then((res) => setCompany(res.data.data))
      .catch(() => setCompany(null))
      .finally(() => setLoadingCompany(false));
  }, []);

  useEffect(() => {
    if (user) {
      setProfile({ name: user.name, phone: user.phone ?? '' });
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      const res = await api.put<ApiResponse<User>>(`/users/${user.id}`, {
        name: profile.name,
        phone: profile.phone || undefined,
      });
      saveUser(res.data.data);
      toast.success('Perfil atualizado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPassword.length < 8) {
      toast.error('Nova senha deve ter no mínimo 8 caracteres');
      return;
    }
    setSavingPassword(true);
    try {
      await api.patch('/users/me/password', passwords);
      toast.success('Senha alterada');
      setPasswords({ currentPassword: '', newPassword: '' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar senha');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setSavingCompany(true);
    try {
      const res = await api.put<ApiResponse<Company>>('/companies/me', {
        name: company.name,
        document: company.document || undefined,
        email: company.email,
        phone: company.phone || undefined,
      });
      setCompany(res.data.data);
      toast.success('Empresa atualizada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSavingCompany(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie sua conta e integrações
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="company">Empresa</TabsTrigger>
          <TabsTrigger value="plan" disabled>
            Plano
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Meus dados</CardTitle>
              <CardDescription>Atualize seu nome e telefone</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user?.email ?? ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile({ ...profile, phone: e.target.value })
                    }
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Perfil</Label>
                  <div>
                    <Badge variant="secondary">{user?.role}</Badge>
                  </div>
                </div>
                <Button type="submit" disabled={savingProfile}>
                  {savingProfile ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Alterar senha</CardTitle>
              <CardDescription>Mínimo 8 caracteres</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Senha atual</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwords.currentPassword}
                    onChange={(e) =>
                      setPasswords({
                        ...passwords,
                        currentPassword: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwords.newPassword}
                    onChange={(e) =>
                      setPasswords({
                        ...passwords,
                        newPassword: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <Button type="submit" disabled={savingPassword}>
                  {savingPassword ? 'Alterando...' : 'Alterar senha'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados da empresa</CardTitle>
              <CardDescription>
                {isAdmin
                  ? 'Atualize os dados da sua empresa'
                  : 'Apenas administradores podem editar'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCompany ? (
                <div className="flex justify-center py-6">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : !company ? (
                <p className="text-sm text-muted-foreground">
                  Não foi possível carregar a empresa.
                </p>
              ) : (
                <form onSubmit={handleSaveCompany} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cname">Nome</Label>
                    <Input
                      id="cname"
                      value={company.name}
                      onChange={(e) =>
                        setCompany({ ...company, name: e.target.value })
                      }
                      disabled={!isAdmin}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cemail">Email</Label>
                    <Input
                      id="cemail"
                      type="email"
                      value={company.email}
                      onChange={(e) =>
                        setCompany({ ...company, email: e.target.value })
                      }
                      disabled={!isAdmin}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cdoc">CNPJ / Documento</Label>
                    <Input
                      id="cdoc"
                      value={company.document ?? ''}
                      onChange={(e) =>
                        setCompany({ ...company, document: e.target.value })
                      }
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cphone">Telefone</Label>
                    <Input
                      id="cphone"
                      value={company.phone ?? ''}
                      onChange={(e) =>
                        setCompany({ ...company, phone: e.target.value })
                      }
                      disabled={!isAdmin}
                    />
                  </div>
                  {isAdmin && (
                    <Button type="submit" disabled={savingCompany}>
                      {savingCompany ? 'Salvando...' : 'Salvar alterações'}
                    </Button>
                  )}
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
