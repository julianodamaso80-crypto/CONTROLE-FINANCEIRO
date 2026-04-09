# Setup do Backend — Controle Financeiro

## 1. Configurar variáveis de ambiente

```bash
# Na pasta backend/
cp .env.example .env
```

Edite o `.env` se necessário (em dev, os valores padrão funcionam).

## 2. Subir PostgreSQL e Redis

```bash
# Na raiz do projeto (CONTROLE FINANCEIRO/)
cp .env.example .env
docker-compose up -d
```

Aguarde o healthcheck do Postgres ficar healthy:
```bash
docker-compose ps
```

## 3. Rodar a primeira migration

```bash
cd backend
npx prisma migrate dev --name init
```

Isso cria todas as tabelas no banco.

## 4. Iniciar em desenvolvimento

```bash
npm run start:dev
```

O servidor estará em `http://localhost:3000/api`.

## 5. Testando os endpoints

### Registrar empresa + usuário admin

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Minha Empresa",
    "name": "Admin",
    "email": "admin@empresa.com",
    "password": "12345678"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@empresa.com",
    "password": "12345678"
  }'
```

Use o `accessToken` retornado no header `Authorization: Bearer <token>` das demais requisições.

## 6. Endpoints disponíveis nesta leva

| Método | Rota                      | Descrição                    | Auth  |
|--------|---------------------------|------------------------------|-------|
| POST   | /api/auth/register        | Registrar empresa + admin    | Não   |
| POST   | /api/auth/login           | Login                        | Não   |
| GET    | /api/companies/me         | Dados da empresa             | Sim   |
| PUT    | /api/companies/me         | Atualizar empresa (ADMIN)    | Sim   |
| GET    | /api/users                | Listar usuários              | Sim   |
| GET    | /api/users/:id            | Detalhar usuário             | Sim   |
| POST   | /api/users                | Criar usuário (ADMIN)        | Sim   |
| PUT    | /api/users/:id            | Atualizar usuário (ADMIN)    | Sim   |
| DELETE | /api/users/:id            | Desativar usuário (ADMIN)    | Sim   |
| PATCH  | /api/users/me/password    | Trocar própria senha         | Sim   |
| GET    | /api/categories           | Listar categorias            | Sim   |
| GET    | /api/categories/:id       | Detalhar categoria           | Sim   |
| POST   | /api/categories           | Criar categoria              | Sim   |
| PUT    | /api/categories/:id       | Atualizar categoria          | Sim   |
| DELETE | /api/categories/:id       | Excluir categoria            | Sim   |
| GET    | /api/clients              | Listar clientes              | Sim   |
| GET    | /api/clients/:id          | Detalhar cliente             | Sim   |
| POST   | /api/clients              | Criar cliente                | Sim   |
| PUT    | /api/clients/:id          | Atualizar cliente            | Sim   |
| DELETE | /api/clients/:id          | Desativar cliente            | Sim   |
| GET    | /api/suppliers            | Listar fornecedores          | Sim   |
| GET    | /api/suppliers/:id        | Detalhar fornecedor          | Sim   |
| POST   | /api/suppliers            | Criar fornecedor             | Sim   |
| PUT    | /api/suppliers/:id        | Atualizar fornecedor         | Sim   |
| DELETE | /api/suppliers/:id        | Desativar fornecedor         | Sim   |
| GET    | /api/bank-accounts        | Listar contas bancárias      | Sim   |
| GET    | /api/bank-accounts/:id    | Detalhar conta               | Sim   |
| POST   | /api/bank-accounts        | Criar conta bancária         | Sim   |
| PUT    | /api/bank-accounts/:id    | Atualizar conta              | Sim   |
| DELETE | /api/bank-accounts/:id    | Excluir conta                | Sim   |

---

## Fase 2 — Segmentos, Transações e Dashboard

### Seed de dados de teste

Após rodar a migration, popule o banco com dados realistas:

```bash
npm run db:seed
```

Credenciais do seed: `admin@teste.com` / `senha123`

### Exemplo: criar uma transação

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "type": "EXPENSE",
    "amount": 150.50,
    "description": "Material de escritório",
    "date": "2026-04-09",
    "dueDate": "2026-04-15",
    "status": "PENDING",
    "categoryId": "UUID_DA_CATEGORIA",
    "segmentId": "UUID_DO_SEGMENTO",
    "bankAccountId": "UUID_DA_CONTA",
    "tags": ["escritório", "material"],
    "notes": "Compra na papelaria"
  }'
```

### Endpoints da Fase 2

| Método | Rota                          | Descrição                        | Auth |
|--------|-------------------------------|----------------------------------|------|
| GET    | /api/segments                 | Listar segmentos                 | Sim  |
| GET    | /api/segments/:id             | Detalhar segmento                | Sim  |
| POST   | /api/segments                 | Criar segmento                   | Sim  |
| PUT    | /api/segments/:id             | Atualizar segmento               | Sim  |
| DELETE | /api/segments/:id             | Desativar segmento (soft delete) | Sim  |
| GET    | /api/transactions             | Listar transações (com filtros)  | Sim  |
| GET    | /api/transactions/:id         | Detalhar transação               | Sim  |
| POST   | /api/transactions             | Criar transação                  | Sim  |
| PUT    | /api/transactions/:id         | Atualizar transação              | Sim  |
| DELETE | /api/transactions/:id         | Excluir transação                | Sim  |
| PATCH  | /api/transactions/:id/pay     | Marcar como paga                 | Sim  |
| PATCH  | /api/transactions/:id/cancel  | Cancelar transação               | Sim  |
| GET    | /api/dashboard                | Dashboard com KPIs e gráficos    | Sim  |

### Filtros disponíveis no GET /api/transactions

| Parâmetro     | Tipo   | Descrição                          |
|---------------|--------|------------------------------------|
| type          | enum   | INCOME ou EXPENSE                  |
| status        | enum   | PENDING, PAID, OVERDUE, CANCELLED  |
| categoryId    | uuid   | Filtrar por categoria              |
| segmentId     | uuid   | Filtrar por segmento               |
| bankAccountId | uuid   | Filtrar por conta bancária         |
| dateFrom      | date   | Data inicial (YYYY-MM-DD)          |
| dateTo        | date   | Data final (YYYY-MM-DD)            |
| search        | string | Busca em descrição e notas         |
| page          | number | Página (default 1)                 |
| limit         | number | Itens por página (default 20)      |
| sortBy        | string | date, amount, createdAt, description |
| sortOrder     | string | asc ou desc (default desc)         |

### Filtros disponíveis no GET /api/dashboard

| Parâmetro | Tipo | Descrição                                  |
|-----------|------|--------------------------------------------|
| segmentId | uuid | Filtrar KPIs e gráficos por segmento       |
| dateFrom  | date | Data inicial (default: 1º dia do mês)      |
| dateTo    | date | Data final (default: último dia do mês)    |
