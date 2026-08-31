---
name: docker-only
description: >-
  Runs docs-flow tooling via Docker (node:22-alpine) instead of host npm/node.
  Use when installing dependencies, running tests, Prisma, Nest builds, lint via
  shell, or any npm/npx/node command in this repo. Use when the user mentions
  npm run dev, npm run install, npm ci, jest, prisma, node_modules, or WSL setup.
---

# Docker-only (docs-flow)

Este monorepo **não usa Node/npm no host** para tarefas de tooling. Comandos rodam no Docker e escrevem em `node_modules/`, `packages/*/dist/` e `coverage/` no host para o IDE.

## Runtime canônico

| Item | Valor |
|------|--------|
| Imagem dev/test | `node:22-alpine` |
| Compose dev | `docker-compose.dev.yml` (project `docs-flow-dev`) |
| Compose test | `docker-compose.test.yml` (project `docs-flow-test`) |
| Compose prod | `docker-compose.yml` (project `docs-flow-prod`) |
| Usuário no container | `DEV_UID` / `DEV_GID` do host |

Antes de `docker compose run` em dev/test, exportar:

```bash
export DEV_UID="$(id -u)"
export DEV_GID="$(id -g)"
```

## Nunca executar no host

- `npm install`, `npm ci`, `npm update`
- `npx jest`, `npx prisma`, `nest build` (para validar o projeto)
- `node apps/api/dist/main.js` (use compose ou scripts)

Exceção: só se o usuário pedir **explicitamente** depuração fora do Docker.

## Sempre preferir (scripts do repo)

| Tarefa | Comando |
|--------|---------|
| Subir dev completo | `npm run dev` ou `./scripts/build.sh dev` |
| Instalar / sincronizar deps | `npm run install` |
| Testes + coverage | `npm run test` |
| Testes watch | `npm run test:up` depois `npm run test:watch` |
| Migrations | `npm run db:migrate` |
| Seed | `npm run db:seed` |
| Prisma generate | `npm run db:generate` |
| Reset banco dev | `npm run db:reset` |
| Prod local | `npm run prod` |
| Parar stacks | `npm run down` |

## Scripts internos

| Script | Uso |
|--------|-----|
| `scripts/docker-install.sh` | Limpeza + install completo (build types/ui + prisma generate) |
| `scripts/ensure-docker-deps.sh` | Limpeza + install só se `node_modules` falta ou lockfile mudou |
| `scripts/docker-clean-artifacts.sh` | Remove `node_modules`, `dist`, `apps/*/.next`, `coverage` com dono root |

## Comando ad-hoc via compose (dev)

Profile `setup` para `install`, `migrate`, `seed`:

```bash
export DEV_UID="$(id -u)" DEV_GID="$(id -g)"
docker compose -f docker-compose.dev.yml --profile setup run --rm install \
  sh -c 'cd apps/api && npx prisma generate'
```

Serviço `install` usa `npm install` (não `npm ci`) — lockfile cross-platform.

## Comando ad-hoc via compose (test)

```bash
export DEV_UID="$(id -u)" DEV_GID="$(id -g)"
docker compose -f docker-compose.test.yml run --rm test \
  npx jest --config jest.config.cjs --coverage=false
```

## Permissões (root no host)

Se `npm install` falha com `EACCES` em `node_modules`, `apps/api/dist` ou `coverage/`:

```bash
docker compose -f docker-compose.dev.yml --profile setup run --rm --user root install \
  sh -c 'rm -rf node_modules apps/*/node_modules packages/*/node_modules packages/types/dist packages/ui/dist apps/api/dist coverage'
npm run install
```

Ou rodar `npm run install` após `scripts/docker-clean-artifacts.sh` (já incluso nos scripts).

## Prod

Build de imagens: `npm run prod` (projeto `docs-flow-prod`; volumes externos `docs-flow_postgres_data` e `docs-flow_uploads_data`). Migrations/seed rodam no container builder com `prisma.config.ts` em `apps/api/`. Ao subir prod, o dev é derrubado automaticamente.

## Alternar dev ↔ prod

Volumes de banco/uploads são **isolados** (`docs-flow-dev_*` vs `docs-flow_*`). `npm run down` derruba ambos os stacks (inclui projeto legado `docs-flow`).

## Referência

Detalhes de setup humano: `docs/instalacao.md`
