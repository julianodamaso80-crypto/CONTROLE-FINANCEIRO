# WhatsApp + IA — Guia de Setup

## Preencher variáveis de ambiente

Adicione no `.env` do backend:

```env
# Evolution API (WhatsApp)
EVOLUTION_API_URL=https://n8n-evolution.aynvvy.easypanel.host
EVOLUTION_API_KEY=sua_api_key_global_aqui
EVOLUTION_INSTANCE_PREFIX=meucaixa_

# OpenRouter (IA)
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxx
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Webhook (URL pública que a Evolution API chama)
PUBLIC_WEBHOOK_URL=https://seu-dominio.com
```

## Webhook em desenvolvimento (ngrok)

1. Instale ngrok: `npm install -g ngrok`
2. Inicie o backend: `npm run start:dev` (porta 3000)
3. Em outro terminal: `ngrok http 3000`
4. Copie a URL HTTPS gerada (ex: `https://abc123.ngrok-free.app`)
5. Coloque no `.env`: `PUBLIC_WEBHOOK_URL=https://abc123.ngrok-free.app`
6. Reinicie o backend

Em produção, use o domínio real do seu backend.

## Webhook em produção (EasyPanel)

Se o backend roda no EasyPanel, a URL pública já existe.
Use: `PUBLIC_WEBHOOK_URL=https://seu-backend.easypanel.host`

## Testar

1. Faça login no Meu Caixa
2. Vá em **Configurações > WhatsApp**
3. Clique em **Conectar WhatsApp**
4. Escaneie o QR Code com o WhatsApp do celular
5. Após conectar, mande uma mensagem para si mesmo:
   - `gastei 50 no uber` → registra despesa
   - `recebi 2k do cliente` → registra receita
   - `saldo` → mostra saldo das contas
   - `ajuda` → lista todos os comandos

## Endpoints novos

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/whatsapp/connect` | JWT | Cria instância e retorna QR Code |
| GET | `/api/whatsapp/status` | JWT | Status da conexão + QR |
| DELETE | `/api/whatsapp/disconnect` | JWT | Desconecta WhatsApp |
| POST | `/api/whatsapp/webhook` | Público | Recebe eventos da Evolution API |

## Troubleshooting

### QR Code não aparece
- Verifique se `EVOLUTION_API_URL` está correto e acessível
- Verifique se `EVOLUTION_API_KEY` está correto
- Tente acessar `GET {EVOLUTION_API_URL}/instance/fetchInstances` manualmente

### Webhook não chega
- Verifique se `PUBLIC_WEBHOOK_URL` aponta para o backend correto
- Em dev: verifique se o ngrok está rodando e a URL está atualizada
- Teste: `curl -X POST {PUBLIC_WEBHOOK_URL}/api/whatsapp/webhook -d '{}'`

### Mensagem não é processada
- Verifique os logs do backend (`[WhatsAppService]`)
- Mensagens de grupo são ignoradas (apenas conversas privadas)
- Mensagens enviadas pelo próprio número são ignoradas
- Verifique se `OPENROUTER_API_KEY` está configurada

### Erro "Variável de ambiente X não configurada"
- Verifique se todas as variáveis estão no `.env`
- Reinicie o backend após alterar o `.env`

### Instância ficou travada
- Desconecte pelo dashboard e reconecte
- Se persistir, acesse a Evolution API diretamente:
  - `DELETE {EVOLUTION_API_URL}/instance/delete/{instanceName}`
  - Depois reconecte pelo Meu Caixa
