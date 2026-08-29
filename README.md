# Docs Flow

Sistema de workflow de documentos com monorepo.

**Documentação completa:** [docs/README.md](./docs/README.md) — inclui [roadmap e lacunas](./docs/roadmap-e-lacunas.md).

## Stack

- **API**: NestJS + Prisma + PostgreSQL
- **Admin**: Next.js 15 + Material UI (porta 3001)
- **Web**: Next.js 15 + Material UI (porta 3000)
- **Infra**: Docker Compose (PostgreSQL + ClamAV)

## Execução (Docker)

Mesmo padrão do projeto **agendamento**: um script com subcomandos.

```bash
chmod +x scripts/build.sh

# Dev com hot-reload (postgres + clamav + api + admin + web)
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
| `CLAMAV_ENABLED` | Scan antivírus nos uploads (padrão: `true`) |

Detalhes: [docs/variaveis-de-ambiente.md](./docs/variaveis-de-ambiente.md)

## Testar antivírus

```bash
./scripts/generate-eicar-test-pdf.sh   # gera eicar-test.pdf
# Envie no wizard — deve ser rejeitado com "possível malware detectado"
```

Veja [docs/api/uploads.md](./docs/api/uploads.md#testar-o-bloqueio-eicar).

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
  build.sh                    # dev | prod | down
  generate-eicar-test-pdf.sh  # PDF de teste para ClamAV
```
