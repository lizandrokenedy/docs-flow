# Docs Flow

Sistema de workflow de documentos com monorepo.

**Documentação completa:** [docs/README.md](./docs/README.md)

## Stack

- **API**: NestJS + Prisma + PostgreSQL
- **Admin**: Next.js 15 + Material UI (porta 3001)
- **Web**: Next.js 15 + Material UI (porta 3000)
- **Infra**: Docker Compose

## Execução (Docker)

Mesmo padrão do projeto **agendamento**: um script com subcomandos.

```bash
chmod +x scripts/build.sh

# Dev com hot-reload (postgres + api + admin + web)
./scripts/build.sh dev

# Prod local
./scripts/build.sh prod

# Derrubar
./scripts/build.sh down
./scripts/build.sh down dev --volumes   # remove volumes também
```

- Admin: http://localhost:3001
- Web: http://localhost:3000/w/abertura-conta
- API: http://localhost:4000
- Swagger: http://localhost:4000/api/docs

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Conexão PostgreSQL |
| `POSTGRES_PORT` | Porta do Postgres exposta no host (padrão: 5433) |
| `NEXT_PUBLIC_API_URL` | URL da API para os frontends |
| `NEXT_PUBLIC_WEB_URL` | URL do app público (links no admin) |
| `WEB_URL` / `ADMIN_URL` | URLs para CORS na API |

Detalhes: [docs/variaveis-de-ambiente.md](./docs/variaveis-de-ambiente.md)

## Estrutura

```
apps/
  api/     # NestJS REST API
  admin/   # Painel administrativo
  web/     # Wizard público de upload
packages/
  types/   # Tipos e schemas Zod compartilhados
  ui/      # Componentes MUI compartilhados
scripts/
  build.sh # dev | prod | down
```
