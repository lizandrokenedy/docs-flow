# API — Submissões (Admin)

**Prefixo:** `/submissions`  
**Arquivos:** `apps/api/src/submissions/submissions.controller.ts`

Endpoints usados pelo painel administrativo para consultar envios.

## Endpoints

### `GET /submissions`

Lista todas as submissões com:

- Dados da submissão (id, status, datas, posição atual)
- Workflow (id, name, slug)
- Uploads (todos os arquivos)

Ordenação: mais recentes primeiro.

### `GET /submissions/:id`

Submissão completa incluindo:

- Workflow com todas as etapas e tipos de documento
- Lista de uploads com metadados

Usado na tela de detalhe do admin.

## Status

| Valor | Descrição |
|-------|-----------|
| `IN_PROGRESS` | Em andamento |
| `COMPLETED` | Finalizada pelo usuário |
| `DRAFT` | Definido no schema, não utilizado atualmente |

## Modelo de dados

Veja tabela `submissions` em [banco-de-dados.md](../banco-de-dados.md).
