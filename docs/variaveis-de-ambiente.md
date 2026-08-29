# Variáveis de ambiente

Arquivo de referência: `.env.example`

## Banco de dados

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `DATABASE_URL` | `postgresql://docsflow:docsflow@localhost:5433/docsflow?schema=public` | Connection string do PostgreSQL para Prisma |
| `POSTGRES_PORT` | `5433` | Porta do Postgres no host (Docker) |

## API

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `PORT` | `4000` | Porta HTTP da API |
| `UPLOAD_DIR` | `/app/uploads` (dentro do container) | Diretório de armazenamento de arquivos |
| `WEB_URL` | `http://localhost:3000` | Origem permitida no CORS (app pública) |
| `ADMIN_URL` | `http://localhost:3001` | Origem permitida no CORS (admin) |

## ClamAV (antivírus)

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `CLAMAV_ENABLED` | `true` | Habilita scan nos uploads (`false` desliga) |
| `CLAMAV_HOST` | `clamav` (no Compose) | Hostname do daemon `clamd` |
| `CLAMAV_PORT` | `3310` | Porta TCP do `clamd` (exposta no host em dev para debug) |
| `CLAMAV_TIMEOUT_MS` | `60000` | Timeout do scan em milissegundos |

## Frontends (Next.js)

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | URL base da API usada pelo browser |
| `NEXT_PUBLIC_WEB_URL` | `http://localhost:3000` | URL da web pública (links "Abrir público" no admin) |

## Observações

- Variáveis `NEXT_PUBLIC_*` são embutidas no build do Next.js e expostas ao cliente.
- Dentro do Docker Compose, a API usa `DATABASE_URL` com hostname `postgres` (rede interna dos containers).
- `CLAMAV_HOST` é definido no Compose (`clamav`), não no `.env` — só `CLAMAV_ENABLED`, `CLAMAV_PORT` e `CLAMAV_TIMEOUT_MS` vêm do `.env`.
- O `.env` na raiz do projeto é lido pelo Compose para portas e URLs expostas ao navegador.

## Exemplo completo

```env
DATABASE_URL=postgresql://docsflow:docsflow@localhost:5433/docsflow?schema=public
POSTGRES_PORT=5433

PORT=4000
UPLOAD_DIR=/app/uploads

CLAMAV_ENABLED=true
CLAMAV_PORT=3310
CLAMAV_TIMEOUT_MS=60000

WEB_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001

NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WEB_URL=http://localhost:3000
```
