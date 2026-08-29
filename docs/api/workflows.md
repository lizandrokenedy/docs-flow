# API — Workflows

**Prefixo:** `/workflows`  
**Arquivos:** `apps/api/src/workflows/`

## Endpoints — Workflow

### `GET /workflows`

Lista workflows **não-template** (`isTemplate: false`) com etapas, tipos de documento e contagem de submissões.

### `GET /workflows/templates`

Lista workflows marcados como template (`isTemplate: true`), ordenados por categoria e nome.

### `GET /workflows/:id`

Workflow completo com etapas ordenadas por `position`.

### `POST /workflows`

```json
{
  "name": "Abertura de Conta",
  "slug": "abertura-conta",
  "description": "Envie seus documentos",
  "isActive": false
}
```

- `slug` deve ser único (regex: `^[a-z0-9]+(?:-[a-z0-9]+)*$`)
- `409 Conflict` se slug já existir

### `POST /workflows/:id/duplicate`

Duplica workflow com novo slug (sufixo `-copia`, `-copia-2`, …). Remapeia `conditionStepId` entre etapas copiadas. Cópia inicia **inativa** e não é template.

Body opcional: `{ "name": "...", "slug": "..." }`.

### `POST /workflows/from-template/:templateId`

Cria workflow a partir de template (`isTemplate: true`). Mesmo comportamento de `duplicate`.

### `PATCH /workflows/:id`

Atualização parcial. Regras:

- Alterar `slug` bloqueado se workflow tiver submissões
- `isActive: true` exige pelo menos 1 etapa
- Se `_count.submissions > 0`, incrementa `version` ao salvar

Campos adicionais: `isTemplate`, `templateCategory`.

### `DELETE /workflows/:id`

Remove workflow, etapas, submissões e uploads em cascata.

## Endpoints — Etapas

### `POST /workflows/:id/steps`

Adiciona etapa. Se `position` omitido, adiciona ao final.

```json
{
  "documentTypeId": "00000000-0000-0000-0000-000000000002",
  "title": "CPF",
  "instructions": "Envie frente e verso",
  "helpText": "Use boa iluminação",
  "exampleUrl": "https://exemplo.com",
  "stepKind": "DOCUMENT",
  "branchKey": "pf",
  "conditionStepId": "uuid-da-etapa-anterior",
  "conditionValue": null,
  "choiceOptions": [],
  "isRequired": true,
  "maxFiles": 1,
  "acceptedExtensionsOverride": ["pdf"]
}
```

| Campo | Regras |
|-------|--------|
| `documentTypeId` | Obrigatório; formato UUID (aceita IDs fixos do seed) |
| `stepKind` | `DOCUMENT` (padrão) ou `CHOICE` |
| `choiceOptions` | Obrigatório ≥ 2 opções se `stepKind === CHOICE` |
| `conditionStepId` | Deve referenciar etapa **anterior** (`position` menor) |
| `conditionValue` | Opcional; só válido se pré-requisito for CHOICE e valor existir em `choiceOptions` |

### `PATCH /workflows/:id/steps/reorder`

Reordena etapas em transação de duas fases (evita conflito na unique `workflowId + position`).

```json
{
  "steps": [
    { "id": "uuid-1", "position": 0 },
    { "id": "uuid-2", "position": 1 }
  ]
}
```

**Validações:**

- Deve incluir **todas** as etapas do workflow
- Posições contínuas de `0` a `n-1`
- IDs devem ser UUID válidos

**Pós-reordenação:** `sanitizeStepConditions()` remove condicionais inválidas (pré-requisito na mesma posição ou depois).

**Resposta:** workflow completo + `clearedConditions` (número de condicionais removidas).

### `PATCH /workflows/:id/steps/:stepId`

Atualização parcial. Mesmos campos do POST. Enviar `conditionStepId: null` remove a condicional.

### `DELETE /workflows/:id/steps/:stepId`

Remove etapa, limpa `conditionStepId` de etapas que a referenciavam e reindexa posições.

## Modelo de dados

Veja tabelas `workflows` e `workflow_steps` em [banco-de-dados.md](../banco-de-dados.md).

## Lógica compartilhada

Visibilidade de etapas: `packages/types/src/workflow-logic.ts` (usado pela API e pelo wizard).
