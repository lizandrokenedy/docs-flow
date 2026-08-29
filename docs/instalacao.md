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

Sobe: PostgreSQL, **ClamAV**, API, Admin e Web.

Na subida, a API executa automaticamente `prisma generate`, migrations e seed. O serviço **ClamAV** pode levar até ~2 minutos na primeira inicialização (download das definições de vírus); a API só inicia após o healthcheck do ClamAV passar.

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

## Scripts utilitários

| Script | Descrição |
|--------|-----------|
| `./scripts/build.sh` | Sobe/para ambiente Docker (dev, prod) |
| `./scripts/generate-eicar-test-pdf.sh` | Gera PDF de teste para validar o ClamAV |
