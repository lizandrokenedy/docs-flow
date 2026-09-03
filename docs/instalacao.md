# Instalação e execução

## Pré-requisitos

- Docker
- Docker Compose

**Não é necessário** instalar Node/npm localmente. Dependências, builds de pacotes e `prisma generate` rodam **dentro do Docker** e o resultado é escrito no host (`node_modules/`, `packages/*/dist/`) para o IDE e o TypeScript funcionarem sem instalação local.

Use **`npm run install`** para sincronizar dependências — **não** rode `npm install` no host (o script `install` do `package.json` é só para Docker via `npm run install`).

## Scripts npm (atalhos)

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Dev com hot-reload (`./scripts/build.sh dev`) |
| `npm run prod` | Prod local com imagens Docker |
| `npm run down` | Derruba dev **e** prod (`down all`) |
| `npm run install` | Deps + build types/ui + `prisma generate` via Docker |
| `npm run db:migrate` / `db:seed` / `db:generate` / `db:reset` | Banco (dev) |
| `npm run test` | Jest + cobertura (stack isolada) |

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

Equivalente: `npm run dev`.

### O que acontece na subida

1. **install** (one-shot) — `npm install`, build de `@docs-flow/types` e `@docs-flow/ui`, `prisma generate`
2. **postgres** + **clamav** sobem em paralelo
3. **migrate** aplica migrations e encerra
4. **seed** popula dados iniciais e encerra
5. **api**, **admin** e **web** sobem com hot-reload

O serviço **ClamAV** pode levar até ~2 minutos na primeira inicialização (download das definições de vírus).

### O que fica no host (para o IDE)

Após o `install`, estes caminhos existem no seu disco e o Cursor/VS Code pode usá-los:

| Caminho | Conteúdo |
|---------|----------|
| `node_modules/` | Dependências npm + links dos workspaces (`@docs-flow/types`, `@docs-flow/ui`, etc.) |
| `packages/types/dist/` | Build compilado de `@docs-flow/types` |
| `packages/ui/dist/` | Build compilado de `@docs-flow/ui` |
| `node_modules/.prisma/` | Client Prisma gerado |

Isso resolve erros como `Cannot find module '@docs-flow/types'` no editor **sem** rodar `npm install` na máquina.

### `@docs-flow/types` e a API

A API importa `@docs-flow/types` como qualquer dependência de workspace — não há `paths` especiais no `tsconfig` da API. O pacote aponta para `packages/types/dist/` após o build. O serviço `install` (e a subida da API) garantem que esse `dist/` exista antes do Nest compilar.

Se o editor ainda mostra erro após `./scripts/build.sh dev`, reinicie o TypeScript server: **TypeScript: Restart TS Server**.

### Reinstalar dependências

```bash
npm run install
```

Útil após `git pull` que altera `package-lock.json` ou quando dependências parecem inconsistentes.

Os comandos `npm run db:*` e `npm run test` chamam `scripts/ensure-docker-deps.sh`, que instala via Docker se `node_modules` estiver ausente ou desatualizado em relação ao `package-lock.json`.

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

Equivalente: `npm run prod`.

Builda imagens Docker (API, admin, web), aplica migrations/seed e sobe o stack. O ambiente **dev** é derrubado automaticamente antes (mesmas portas: 3000, 3001, 4000, 5433).

Containers de prod usam o prefixo `docs-flow-prod-*`. Admin exige `PORT=3001` e `HOSTNAME=0.0.0.0` no compose (Next.js standalone).

## Dev e prod isolados

Dev e prod **não compartilham** banco nem uploads. Cada ambiente tem volumes Docker fixos:

| Ambiente | Postgres | Uploads |
|----------|----------|---------|
| dev | `docs-flow-dev_postgres_data` | `docs-flow-dev_uploads_data` |
| prod | `docs-flow_postgres_data` | `docs-flow_uploads_data` |

Ao alternar `npm run dev` ↔ `npm run prod`, os dados do ambiente anterior **permanecem no volume** — você só passa a ver o banco do ambiente que está rodando. Isso não é perda de dados.

O `build.sh` derruba o stack oposto antes de subir o novo (evita conflito de portas). `npm run down` derruba **ambos** (projetos Compose `docs-flow-dev`, `docs-flow-prod` e legado `docs-flow`).

## Parar containers

```bash
npm run down                  # dev + prod (recomendado ao alternar manualmente)
./scripts/build.sh down dev   # só dev
./scripts/build.sh down prod  # só prod
./scripts/build.sh down all   # igual ao npm run down
```

Flags úteis:

- `--no-cache` — rebuild sem cache (`dev` ou `prod`)
- `--volumes` — remove volumes no `down` (apaga banco e uploads **do compose alvo**)

## Comandos do script `build.sh`

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

## Alterações em `packages/types` e `packages/ui`

No ambiente dev, o código-fonte dos pacotes é montado no container e os builds rodam no Docker:

- **`@docs-flow/types`** — compilado no `install` (`packages/types/dist/`). A API recompila types na subida antes do `nest start --watch`.
- **`@docs-flow/ui`** — compilado no `install`; nos containers web e admin, `tsc --watch` mantém `packages/ui/dist/` atualizado enquanto os frontends rodam.

Recompilar manualmente (via Docker, reflete no host):

```bash
export DEV_UID="$(id -u)" DEV_GID="$(id -g)"
docker compose -f docker-compose.dev.yml --profile setup run --rm install \
  npm run build --workspace=@docs-flow/types
docker compose -f docker-compose.dev.yml --profile setup run --rm install \
  npm run build --workspace=@docs-flow/ui
```

Ou reinstalar tudo: `npm run install`.

Se mudanças no UI não aparecem no browser, reinicie os frontends:

```bash
docker compose -f docker-compose.dev.yml restart web admin
```

## Logs e troubleshooting

```bash
docker compose -f docker-compose.dev.yml logs -f api
docker compose -f docker-compose.dev.yml logs -f clamav
docker compose -f docker-compose.dev.yml ps
```

### Upload com Internal Server Error (permissão em `/app/uploads`)

O volume `docs-flow-dev_uploads_data` é criado como `root`. A API em dev roda com `DEV_UID`/`DEV_GID` do host e não consegue gravar. O serviço `uploads-init` corrige o dono na subida.

Para corrigir o volume já existente sem recriar:

```bash
docker exec -u root docs-flow-dev-api-1 chown -R "$(id -u):$(id -g)" /app/uploads
```

### `apps/*/.next` com permissão errada (após `npm run prod`)

O build de prod cria `apps/web/.next` e `apps/admin/.next` com dono `root`. Ao voltar ao dev, `next dev` pode falhar com `EACCES`. O `build.sh dev` e `docker-clean-artifacts.sh` detectam e removem esses diretórios automaticamente.

Se precisar limpar manualmente:

```bash
bash scripts/docker-clean-artifacts.sh
```

### `node_modules` com permissão errada (setup antigo)

Versões anteriores do compose usavam volumes anônimos para `node_modules`, que deixavam um diretório vazio ou com dono `root` no host. O `build.sh dev` detecta e limpa isso automaticamente.

Se a limpeza falhar, rode manualmente:

```bash
docker compose -f docker-compose.dev.yml run --rm --user root install \
  sh -c 'rm -rf node_modules apps/*/node_modules packages/*/node_modules packages/types/dist packages/ui/dist'
npm run install
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

**Pré-requisitos:** Docker em execução, arquivo `.env.test` na raiz (`cp .env.test.example .env.test`) e `node_modules/` no host (o `npm run test` chama `ensure-docker-deps` automaticamente; ou rode `npm run install` antes).

**Serviços da stack:** `postgres-test` → `migrate-test` → `api-test` (healthcheck) → `test` (Jest).

## Scripts utilitários

| Script | Descrição |
|--------|-----------|
| `./scripts/build.sh` | Sobe/para ambiente Docker (`dev`, `prod`, `down`) |
| `scripts/docker-install.sh` | Usado por `npm run install` |
| `scripts/docker-clean-artifacts.sh` | Limpa artefatos com dono root (`node_modules`, `dist`, `.next`, `coverage`) |
| `scripts/ensure-docker-deps.sh` | Install condicional antes de `test` e `db:*` |
| `./scripts/generate-eicar-test-pdf.sh` | PDF EICAR para validar ClamAV |

Comandos `npm run` — ver tabela no início deste documento.
