# MeuCaixa SEO Worker

Esteira automatizada de blog/SEO do **Meu Caixa** — 15 agentes que pesquisam keywords, escrevem artigos, revisam, publicam direto no GitHub e indexam em Google/Bing/IndexNow.

## Visão rápida

```
SEG 06:00 ── Research (DataForSEO + GSC) ──> seo.keywords + seo.briefings
DIÁRIO 09:00 ── Write (5 → 6 → 7 → 8) ──> seo.articles (status=in_review)
            └─ enfileira Publish ──> Octokit commit master ──> awaiting_pr_merge
A CADA 15min ── Recheck HEAD URL ──> published ──> Sitemap + GSC + Bing + IndexNow
TER 07:00 ── Analyze GSC ──> recommendations ──> Content Updater (top 5)
DIÁRIO 03:00 ── Reporting GSC + GA4 ──> metrics_daily
```

## Stack

- **Runtime**: Node 20 + TypeScript ESM + Fastify
- **Queue**: BullMQ + Redis (reusa o Redis do MeuCaixa em produção)
- **Banco**: Postgres do MeuCaixa, **schema `seo` separado** (não toca em `public` do Prisma)
- **LLM**: OpenRouter → Google Gemini 2.5 Flash
- **Embeddings**: `@xenova/transformers` (multilingual-e5-small, 384 dim, local)
- **Publisher**: Octokit (GitHub API) → commit direto na master
- **Indexação**: GSC API + Bing WMT API + IndexNow + sitemap

## Pasta

```
seo-worker/
├── Dockerfile
├── package.json
├── tsconfig.json
├── .env.example
├── migrations/
│   └── 001_seo_schema.sql        # schema seo completo (16 tabelas + view + pgvector)
└── src/
    ├── server.ts                 # Fastify + boot scheduler + workers
    ├── scheduler.ts              # node-cron (semanal, diário, 15min)
    ├── queue.ts                  # 5 filas BullMQ
    ├── config.ts                 # Zod parse envs
    ├── agents/                   # 15 agentes (01-keyword-research … 15-reporting)
    ├── workers/                  # 5 consumers BullMQ
    ├── integrations/             # llm, github, gsc, bing, indexnow, dataforseo, image-gen, embeddings
    ├── db/                       # pg pool + repositories
    ├── lib/                      # logger, redis, scope-guard, mdx
    ├── routes/                   # health + runs/* webhooks
    └── scripts/                  # apply-migrations, seed-*, doctor, today-status
```

## Setup local (1ª vez)

```powershell
cd seo-worker
npm install
cp .env.example .env
# editar .env: DATABASE_URL, REDIS_URL, OPENROUTER_API_KEY, GITHUB_TOKEN, etc

# Aplicar schema seo no Postgres
npm run build
npm run migrate

# Popular clusters, data_sources, seed_keywords
npm run seed:clusters
npm run seed:data-sources
node dist/scripts/seed-keywords.js

# Validar credenciais
npm run doctor

# Dev
npm run dev
```

## Deploy no EasyPanel (VPS Hostinger)

1. **App service novo** no EasyPanel
2. **Source**: GitHub `julianodamaso/CONTROLE-FINANCEIRO`
3. **Build**: Dockerfile path `seo-worker/Dockerfile`, build context `seo-worker/`
4. **Network**: anexar à mesma do Redis + Postgres do MeuCaixa
5. **Envs**: copiar `.env.example` e preencher tudo (ver checklist abaixo)
6. **Domain**: NÃO expor externamente — só rede interna (`seo-worker:8080`)
7. **Após primeiro deploy**:
   ```bash
   # SSH no servidor
   docker exec -w /app $(docker ps -q -f name=seo-worker) node dist/scripts/apply-migrations.js
   docker exec -w /app $(docker ps -q -f name=seo-worker) node dist/scripts/seed-clusters.js
   docker exec -w /app $(docker ps -q -f name=seo-worker) node dist/scripts/seed-data-sources.js
   docker exec -w /app $(docker ps -q -f name=seo-worker) node dist/scripts/seed-keywords.js
   docker exec -w /app $(docker ps -q -f name=seo-worker) node dist/scripts/doctor.js
   ```

## Checklist de credenciais

| Env | Origem | Obrigatório? |
|---|---|---|
| `DATABASE_URL` | Postgres do MeuCaixa | ✅ |
| `REDIS_URL` | Redis do MeuCaixa (porta 6380 em dev, EasyPanel em prod) | ✅ |
| `OPENROUTER_API_KEY` | Reusar do projeto 21Go | ✅ |
| `GITHUB_TOKEN` | PAT fine-grained com Contents:Write no repo | ✅ |
| `TRIGGER_SECRET` | UUID/hex aleatório de 32+ chars | ✅ |
| `GOOGLE_REFRESH_TOKEN` + `GSC_SITE_URL` | OAuth playground com scope `webmasters` | recomendado |
| `GA4_PROPERTY_ID` | Console GA4 | recomendado |
| `BING_API_KEY` + `BING_SITE_URL` | bing.com/webmasters | recomendado |
| `INDEXNOW_KEY` | UUID v4 + arquivo /public/{key}.txt | recomendado |
| `DATAFORSEO_LOGIN` + `DATAFORSEO_PASSWORD` | app.dataforseo.com | opcional |

> Sem `DATAFORSEO_*`, o Agente 01 funciona só com GSC + seed_keywords. Sem `GSC_*`, ele depende só dos seeds.

## IndexNow — passo final

Gere uma chave UUID e crie o arquivo público no Next.js:

```powershell
# Gerar
$key = [guid]::NewGuid().ToString().ToLower()
# Salvar no .env
echo "INDEXNOW_KEY=$key" | Add-Content seo-worker\.env
# Criar arquivo público
echo $key | Out-File -Encoding utf8 -NoNewline "frontend\public\$key.txt"
```

Após deploy do frontend, verificar:
```
https://meucaixa.store/{INDEXNOW_KEY}.txt   # tem que retornar a key
```

## Cronograma de produção

| Cron | Ação |
|---|---|
| Segunda 06:00 BRT | Pesquisa de keywords + briefings (estoca pra semana) |
| Todos os dias 09:00 BRT | Escreve + revisa + commita 4 artigos (1 controle-gastos + 1 orçamento + 1 whatsapp + 1 bônus) |
| Cada 15 min | Promove `awaiting_pr_merge → published` se URL HEAD 200, depois indexa |
| Terça 07:00 BRT | Analisa GSC + atualiza top 5 artigos com pior CTR |
| Todos os dias 03:00 BRT | Snapshot diário GSC + GA4 em `metrics_daily` |

## Comandos manuais (operação)

```bash
# Disparar manualmente (precisa do TRIGGER_SECRET)
curl -X POST http://seo-worker:8080/runs/weekly -H "Authorization: Bearer $TRIGGER_SECRET" -d '{}'
curl -X POST http://seo-worker:8080/runs/daily -H "Authorization: Bearer $TRIGGER_SECRET" -d '{"limit": 4}'
curl -X POST http://seo-worker:8080/runs/publish -H "Authorization: Bearer $TRIGGER_SECRET" -d '{"article_id":"..."}'
curl -X POST http://seo-worker:8080/runs/analyze -H "Authorization: Bearer $TRIGGER_SECRET" -d '{}'

# Status do dia
docker exec -w /app $(docker ps -q -f name=seo-worker) node dist/scripts/today-status.js

# Health + credenciais
curl http://seo-worker:8080/healthz
curl http://seo-worker:8080/credentials
```

## Categorias permitidas (configuração do nicho)

- `controle-de-gastos` — Despesas pessoais, planilhas vs apps
- `orcamento-familiar` — Planejamento, 50/30/20, dívidas, economia doméstica
- `whatsapp-financeiro` — IA, bots, automação de finanças (**diferencial**)
- `educacao-financeira` — Score, IR, cadastro positivo, conceitos básicos

## Fora do escopo (Reviewer bloqueia)

- Day trade ou trading especulativo
- Recomendação de ações específicas
- Criptomoedas de forma especulativa
- Esquemas piramidais / MLM
- Promessas: "fique rico rápido", "rendimento garantido", "investimento sem risco"

## Onde o MDX é publicado

- **Repo**: `julianodamaso/CONTROLE-FINANCEIRO`
- **Branch**: `main`
- **Path**: `frontend/content/blog/{slug}.mdx`
- **Frontend renderiza**: `frontend/src/app/blog/[slug]/page.tsx` via `next-mdx-remote/rsc`

## KPIs (medir após 30/60/90 dias)

| KPI | Meta |
|---|---|
| Artigos/dia respeitando slots A+B+C | 100% dos dias úteis |
| Word count na faixa 1300-1500 | > 90% |
| 3+ citações de fontes oficiais por artigo | 100% |
| 3+ internal links por artigo | 100% |
| Schema rich results | 100% sem warnings |
| GSC clicks 30d | crescimento mês a mês |
| Taxa de REPROVADO no Reviewer | < 5% |

## Anti-patterns (NÃO fazer)

- ❌ Subir artigos sem cobertura de Sources (Reviewer bloqueia)
- ❌ Mudar status direto pra `published` no DB (deixa o pipeline-indexing fazer)
- ❌ Editar MDX manualmente em produção (esteira sobrescreve no próximo update)
- ❌ Adicionar FAQPage schema (Google retirou rich results em 2026-05)
- ❌ Expor `/runs/*` publicamente sem Bearer auth
