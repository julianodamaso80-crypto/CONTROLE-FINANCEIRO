'use client';

import { MessageCircle, CheckCircle2, XCircle, Loader2, Wifi, WifiOff } from 'lucide-react';
import {
  useWhatsAppStatus,
  useConnectWhatsApp,
  useDisconnectWhatsApp,
} from '@/hooks/use-whatsapp';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function formatPhone(phone: string): string {
  // Formata número brasileiro: +55 21 99999-9999
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 13) {
    return `+${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 9)}-${clean.slice(9)}`;
  }
  if (clean.length === 12) {
    return `+${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 8)}-${clean.slice(8)}`;
  }
  return `+${clean}`;
}

export function WhatsAppConnect() {
  const { data, isLoading } = useWhatsAppStatus();
  const connectMutation = useConnectWhatsApp();
  const disconnectMutation = useDisconnectWhatsApp();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const status = data?.status ?? 'NOT_CONNECTED';

  // --- NOT_CONNECTED ---
  if (status === 'NOT_CONNECTED') {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <MessageCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle>Conecte seu WhatsApp</CardTitle>
          <CardDescription>
            Gerencie suas finanças direto pelo WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Registre despesas e receitas por mensagem
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Consulte saldo e vencimentos
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              IA entende português informal
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Funciona 24h, sem precisar abrir o sistema
            </li>
          </ul>
          <Button
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
            onClick={() => connectMutation.mutate()}
            disabled={connectMutation.isPending}
          >
            {connectMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="mr-2 h-4 w-4" />
            )}
            Conectar WhatsApp
          </Button>
        </CardContent>
      </Card>
    );
  }

  // --- PENDING_QR com QR Code ---
  if (status === 'PENDING_QR' && data?.qrCode) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Escaneie o QR Code</CardTitle>
          <CardDescription>
            Use o WhatsApp do seu celular para escanear
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
            <li>Abra o WhatsApp no celular</li>
            <li>Toque em Menu {'>'} Dispositivos conectados</li>
            <li>Toque em Conectar dispositivo</li>
            <li>Aponte a câmera para o QR Code abaixo</li>
          </ol>
          <div className="flex justify-center">
            <img
              src={data.qrCode}
              alt="QR Code WhatsApp"
              className="h-[280px] w-[280px] rounded-lg border"
            />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
            Atualizando automaticamente...
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
          >
            Cancelar
          </Button>
        </CardContent>
      </Card>
    );
  }

  // --- PENDING_QR sem QR ---
  if (status === 'PENDING_QR') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <p className="text-sm text-muted-foreground">
            Gerando QR Code...
          </p>
        </CardContent>
      </Card>
    );
  }

  // --- CONNECTING ---
  if (status === 'CONNECTING') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <p className="font-medium">Conectando ao WhatsApp...</p>
          <p className="text-sm text-muted-foreground">
            Aguarde enquanto estabelecemos a conexão
          </p>
        </CardContent>
      </Card>
    );
  }

  // --- CONNECTED ---
  if (status === 'CONNECTED') {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {data?.profilePicUrl ? (
                <img
                  src={data.profilePicUrl}
                  alt="Perfil"
                  className="h-12 w-12 rounded-full border-2 border-green-200"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-200">
                  <MessageCircle className="h-6 w-6 text-green-700" />
                </div>
              )}
              <div>
                <CardTitle className="text-lg">
                  {data?.profileName ?? 'WhatsApp'}
                </CardTitle>
                <CardDescription>
                  {data?.phoneNumber
                    ? formatPhone(data.phoneNumber)
                    : 'Número não disponível'}
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-green-600">
              <Wifi className="mr-1 h-3 w-3" />
              Conectado
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {data?.lastConnectedAt && (
            <p className="text-xs text-muted-foreground">
              Conectado em{' '}
              {new Date(data.lastConnectedAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}

          <div className="rounded-lg bg-white p-3 text-sm">
            <p className="mb-1 font-medium">
              Agora é só mandar mensagem!
            </p>
            <p className="text-muted-foreground">
              Exemplos: &quot;gastei 50 no uber&quot;, &quot;recebi 2k do
              cliente&quot;, &quot;saldo&quot;, &quot;ajuda&quot;
            </p>
          </div>

          <Button
            variant="destructive"
            className="w-full"
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
          >
            {disconnectMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <WifiOff className="mr-2 h-4 w-4" />
            )}
            Desconectar
          </Button>
        </CardContent>
      </Card>
    );
  }

  // --- DISCONNECTED / FAILED ---
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <XCircle className="h-8 w-8 text-red-600" />
        </div>
        <CardTitle>WhatsApp desconectado</CardTitle>
        <CardDescription>
          {status === 'FAILED'
            ? 'Ocorreu um erro na conexão. Tente novamente.'
            : 'Seu WhatsApp foi desconectado. Reconecte para continuar usando.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full bg-green-600 hover:bg-green-700"
          size="lg"
          onClick={() => connectMutation.mutate()}
          disabled={connectMutation.isPending}
        >
          {connectMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <MessageCircle className="mr-2 h-4 w-4" />
          )}
          Tentar novamente
        </Button>
      </CardContent>
    </Card>
  );
}
