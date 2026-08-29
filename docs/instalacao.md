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

Sobe: PostgreSQL, API, Admin e Web.

Na subida, a API executa automaticamente `prisma generate`, migrations e seed.

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

No ambiente dev, os volumes montam o código-fonte. Se mudanças em `@docs-flow/ui` não aparecerem, reinicie os frontends:

```bash
docker compose -f docker-compose.dev.yml restart web admin
```

## Logs e troubleshooting

```bash
docker compose -f docker-compose.dev.yml logs -f api
docker compose -f docker-compose.dev.yml ps
```
