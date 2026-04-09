# Controle Financeiro — SaaS Multi-Tenant

Sistema de controle financeiro empresarial multi-tenant com integração WhatsApp e inteligência artificial.

## Stack

- **Backend:** NestJS 11, Prisma 6, PostgreSQL 16, Redis 7
- **Frontend:** Next.js (em breve)
- **Integrações:** Bot WhatsApp via Evolution API (em breve), Google Sheets (em breve)

## Como rodar em desenvolvimento

1. Copie o arquivo de variáveis de ambiente:
   ```bash
   cp .env.example .env
   ```

2. Suba os serviços de infraestrutura:
   ```bash
   docker-compose up -d
   ```

3. Instale as dependências e rode a migration:
   ```bash
   cd backend
   npm install
   npx prisma migrate dev --name init
   ```

4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run start:dev
   ```

O backend estará disponível em `http://localhost:3000/api`.

## Estrutura de pastas

```
CONTROLE FINANCEIRO/
├── docker-compose.yml       # PostgreSQL e Redis
├── backend/                 # API NestJS
│   ├── prisma/              # Schema e migrations
│   └── src/
│       ├── common/          # Guards, decorators, filters, interceptors
│       └── modules/         # Módulos de domínio (auth, users, companies, etc.)
└── frontend/                # Next.js (em breve)
```
