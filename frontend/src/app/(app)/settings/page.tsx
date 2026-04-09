'use client';

import { useAuth } from '@/providers/auth-provider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie sua conta e empresa
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Meu perfil</CardTitle>
            <CardDescription>Seus dados de acesso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Nome
              </p>
              <p className="font-medium">{user?.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Email
              </p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Perfil
              </p>
              <Badge variant="secondary">{user?.role}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Em breve</CardTitle>
            <CardDescription>
              Funcionalidades que estão a caminho
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Editar perfil</li>
              <li>Editar dados da empresa</li>
              <li>Conectar WhatsApp</li>
              <li>Conectar Google Sheets</li>
              <li>Gerenciar plano</li>
              <li>Convidar usuários</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
