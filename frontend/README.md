# Finnix — Frontend

Interface web do SaaS de controle financeiro Finnix.

## Stack

- Next.js 14, React 18, TypeScript (strict)
- Tailwind CSS 3, shadcn/ui (manual), Radix UI
- React Query (TanStack Query 5)
- React Hook Form + Zod
- Recharts
- Lucide Icons, Sonner (toasts)

## Como rodar

```bash
# Instale as dependências
npm install

# Configure o ambiente
cp .env.example .env.local

# Inicie o servidor de desenvolvimento
npm run dev
```

O frontend estará em **http://localhost:3001**.

## Credenciais de teste

Após rodar o seed no backend (`cd ../backend && npm run db:seed`):

- **Email:** admin@teste.com
- **Senha:** senha123

## Estrutura de pastas

```
src/
├── app/                    # Rotas Next.js (App Router)
│   ├── (app)/              # Rotas protegidas (com sidebar)
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── segments/
│   │   ├── categories/
│   │   └── settings/
│   ├── login/
│   └── register/
├── components/
│   ├── ui/                 # Componentes base (shadcn)
│   ├── layout/             # Sidebar
│   ├── shared/             # Logo, etc
│   ├── dashboard/          # KPIs, gráficos
│   ├── transactions/       # Tabela, filtros, form
│   ├── segments/           # Cards, form
│   ├── categories/         # Cards, form
│   └── onboarding/         # Dialog de boas-vindas
├── hooks/                  # React Query hooks
├── lib/                    # Utilitários (api, auth, utils)
├── providers/              # Contextos (auth, query)
└── types/                  # Tipos da API
```
