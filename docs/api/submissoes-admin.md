# API — Submissões (Admin)

**Prefixo:** `/submissions`  
**Arquivos:** `apps/api/src/submissions/submissions.controller.ts`

Endpoints usados pelo painel administrativo para consultar envios.

## Endpoints

### `GET /submissions`

Lista todas as submissões com:

- Dados da submissão (id, status, `branchKey`, datas, posição atual)
- Workflow (id, name, slug)
- Uploads (todos os arquivos)

Ordenação: mais recentes primeiro.

### `GET /submissions/:id`

Submissão completa incluindo:

- `branchKey` — perfil escolhido no wizard
- `answers` — respostas de etapas CHOICE (`workflowStepId`, `value`)
- `workflowSnapshot` — JSON gravado na criação
- Workflow com etapas e tipos de documento (**resolvido do snapshot** quando presente)
- Lista de uploads com metadados

Usado na tela de detalhe do admin.

> **Lacuna de UI:** o admin ainda não exibe `branchKey` nem respostas CHOICE — apenas arquivos por etapa.

## Status

| Valor | Descrição |
|-------|-----------|
| `IN_PROGRESS` | Em andamento |
| `COMPLETED` | Finalizada pelo usuário |
| `DRAFT` | Definido no schema, não utilizado |

## Modelo de dados

Veja tabelas `submissions` e `submission_answers` em [banco-de-dados.md](../banco-de-dados.md).
