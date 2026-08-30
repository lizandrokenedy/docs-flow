# Instalação e execução

## Pré-requisitos

- Docker
- Docker Compose

## Configuração inicial

```bash
cp .env.example .env
```

Ajuste as variáveis se necessário (veja [variaveis-de-ambiente.md](./variaveis-de-ambiente.md)).

O script `build.sh` copia `.env.example` → `.env` automaticamente se o arquivo não existir.

## Desenvolvimento (hot-reload)

```bash
chmod +x scripts/build.sh
./scripts/build.sh dev
```

Sobe: PostgreSQL, **ClamAV**, containers one-shot de **migrate** e **seed**, depois API, Admin e Web.

Na subida, `migrate` aplica as migrations e encerra; em seguida `seed` popula dados iniciais e encerra. A API só sobe depois dos dois. O serviço **ClamAV** pode levar até ~2 minutos na primeira inicialização (download das definições de vírus).

Para aplicar migrations manualmente (ex.: após `git pull`):

```bash
npm run db:migrate
npm run db:seed   # opcional; idempotente
npm run db:reset  # apaga volumes, migra e seeda do zero
```

## Produção local

```bash
./scripts/build.sh prod
```

## Parar containers

```bash
./scripts/build.sh down dev    # só ambiente dev
./scripts/build.sh down prod   # só ambiente prod
./scripts/build.sh down all    # todos
```

Flags úteis:

- `--no-cache` — rebuild sem cache
- `--volumes` — remove volumes (apaga banco e uploads)

## Comandos do script

| Comando | Descrição |
|---------|-----------|
| `./scripts/build.sh dev` | Ambiente de desenvolvimento com hot-reload |
| `./scripts/build.sh prod` | Build de produção local |
| `./scripts/build.sh down [dev\|prod\|all]` | Para os containers |

## Verificação

| Serviço | URL |
|---------|-----|
| Web | http://localhost:3000 |
| Admin | http://localhost:3001 |
| API health | http://localhost:4000/health |
| Swagger | http://localhost:4000/api/docs |
| Workflow demo | http://localhost:3000/w/abertura-conta |
| Inventário judicial | http://localhost:3000/w/inventario-judicial |

## Alterações em `packages/ui`

No ambiente dev, os volumes montam o código-fonte. Mudanças em `@docs-flow/ui` são recompiladas automaticamente (`tsc --watch`) nos containers web e admin.

Se algo não aparecer após editar o pacote UI, reinicie os frontends:

```bash
docker compose -f docker-compose.dev.yml restart web admin
```

Ou recompile manualmente:

```bash
npm run build --workspace=@docs-flow/ui
```

## Logs e troubleshooting

```bash
docker compose -f docker-compose.dev.yml logs -f api
docker compose -f docker-compose.dev.yml logs -f clamav
docker compose -f docker-compose.dev.yml ps
```

### ClamAV lento na primeira subida

O container `clamav` baixa definições de vírus na inicialização. A API só sobe depois do healthcheck passar — pode levar **1–2 minutos**. Acompanhe com `logs -f clamav`.

### Testar antivírus (EICAR)

Gera um PDF de teste com assinatura EICAR (padrão da indústria, sem malware real):

```bash
./scripts/generate-eicar-test-pdf.sh
```

Envie `eicar-test.pdf` em qualquer workflow público (ex.: `/w/abertura-conta`). A API deve retornar `400` com *"Arquivo rejeitado: possível malware detectado."*

Mais detalhes e comandos `curl`: [api/uploads.md](./api/uploads.md#testar-o-bloqueio-eicar)

## Testes automatizados

Os testes rodam em stack isolada via `docker-compose.test.yml` com variáveis em `.env.test` (copie de `.env.test.example`).

```bash
cp .env.test.example .env.test
npm run test          # sobe Postgres + migrate + API de teste, roda Jest e derruba a stack
npm run test:up       # mantém a stack no ar (útil com test:watch)
npm run test:watch    # Jest em modo watch (rode test:up antes)
npm run test:down     # derruba a stack de teste
```

A stack sobe Postgres efêmero, aplica migrations e valida que a API inicia (`api-test`). O Jest roda no container `test` com app Nest in-process, conectado ao banco pela rede interna — sem expor portas no host e sem poluir o `.env` de dev.

**Cobertura mínima (80%):** services, utils, `app.factory` e `health.controller` na API; módulos de domínio em `packages/types`. ClamAV fica fora do relatório.

Relatórios HTML em `coverage/api` e `coverage/types` após `npm run test`.

**Pré-requisitos:** Docker em execução e arquivo `.env.test` na raiz (`cp .env.test.example .env.test`).

**Serviços da stack:** `postgres-test` → `migrate-test` → `api-test` (healthcheck) → `test` (Jest).

## Scripts utilitários

| Script | Descrição |
|--------|-----------|
| `./scripts/build.sh` | Sobe/para ambiente Docker (dev, prod) |
| `npm run test` | Testes com cobertura (stack isolada) |
| `npm run test:up` / `npm run test:down` | Mantém ou derruba a stack de teste |
| `./scripts/generate-eicar-test-pdf.sh` | Gera PDF de teste para validar o ClamAV |
