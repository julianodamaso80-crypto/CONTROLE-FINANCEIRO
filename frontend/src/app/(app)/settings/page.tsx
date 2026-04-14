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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WhatsAppConnect } from '@/components/settings/whatsapp-connect';

export default function SettingsPage() {
  const { user } = useAuth();

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
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="sheets" disabled>
            Google Sheets
          </TabsTrigger>
          <TabsTrigger value="plan" disabled>
            Plano
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
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
        </TabsContent>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados da empresa</CardTitle>
              <CardDescription>Em breve</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                A edição dos dados da empresa será disponibilizada em breve.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp">
          <WhatsAppConnect />
        </TabsContent>
      </Tabs>
    </div>
  );
}
