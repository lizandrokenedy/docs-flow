# API — Submissões (Admin)

**Prefixo:** `/submissions`  
**Arquivos:** `apps/api/src/submissions/submissions.controller.ts`

Endpoints usados pelo painel administrativo para consultar e excluir envios.

## Endpoints

### `GET /submissions`

Lista todas as submissões com:

- Dados da submissão (id, status, datas, posição atual)
- Workflow (id, name, slug)
- Uploads (todos os arquivos)

Ordenação: mais recentes primeiro.

### `GET /submissions/:id`

Submissão completa incluindo:

- `answers` — respostas de etapas QUESTION (`workflowStepId`, `value`, `createdAt`)
- `workflowSnapshot` — JSON gravado na criação
- Workflow com etapas e tipos de documento (**resolvido do snapshot** quando presente)
- Lista de uploads com metadados

Usado na tela de detalhe do admin.

### `DELETE /submissions/:id`

Exclui a submissão, respostas, uploads no banco e arquivos no disco.

- `204 No Content` em sucesso
- `404` se não existir

Ordem: remove registros no banco primeiro, depois limpa o diretório de storage da submissão.

## Status

| Valor | Descrição |
|-------|-----------|
| `IN_PROGRESS` | Em andamento |
| `COMPLETED` | Finalizada pelo usuário |
| `DRAFT` | Definido no schema, não utilizado |

## Modelo de dados

Veja tabelas `submissions` e `submission_answers` em [banco-de-dados.md](../banco-de-dados.md).
