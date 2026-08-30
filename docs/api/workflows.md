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

### `GET /workflows/:id/versions`

Lista versões do workflow (atual + arquivadas), com resumo de alterações (`changes`) por entrada.

Cada item inclui: `version`, `changeLabel`, `createdAt`, `isCurrent`, `stepCount`, `changes[]` com `{ description }`.

### `GET /workflows/:id/versions/:versionNumber`

Detalhe de uma versão com diff completo entre `comparedFromVersion` e `comparedToVersion`.

Resposta: `version`, `changeLabel`, `createdAt`, `isCurrent`, `changes[]`, `comparedFromVersion`, `comparedToVersion`.

O diff é calculado por `diffWorkflowSnapshots()` em `packages/types/src/workflow-version-diff.ts`.

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

Duplica workflow com novo slug (sufixo `-copia`, `-copia-2`, …). Remapeia `conditionStepId` entre etapas copiadas. Copia `questionType` e `questionConfig`. Cópia inicia **inativa** e não é template.

Body opcional: `{ "name": "...", "slug": "..." }`.

### `POST /workflows/from-template/:templateId`

Cria workflow a partir de template (`isTemplate: true`). Mesmo comportamento de `duplicate`.

### `PATCH /workflows/:id`

Atualização parcial. Regras:

- Alterar `slug` bloqueado se workflow tiver submissões
- `isActive: true` exige pelo menos 1 etapa
- Com submissões existentes, **só incrementa `version`** se `isActive` for alterado
- Alterações em `name`, `description`, `isTemplate` e `templateCategory` **não** arquivam versão

Campos: `isTemplate`, `templateCategory`, `name`, `slug`, `description`, `isActive`.

### `DELETE /workflows/:id`

Remove workflow, etapas, submissões, versões arquivadas e uploads em cascata.

## Versionamento

Quando `_count.submissions > 0`, a API arquiva o snapshot atual em `workflow_versions` e incrementa `version` **antes** de aplicar alterações de fluxo, em uma única transação.

**Gera nova versão:**

| Operação | Quando |
|----------|--------|
| `PATCH /workflows/:id` | Apenas se `isActive` mudar |
| `POST /workflows/:id/steps` | Sempre |
| `DELETE /workflows/:id/steps/:stepId` | Sempre |
| `PATCH /workflows/:id/steps/reorder` | Sempre |
| `PATCH /workflows/:id/steps/:stepId` | Quando algum campo de fluxo **muda de valor** (`documentTypeId`, `stepKind`, `questionType`, `questionConfig`, `conditionStepId`, `conditionValue`, `isRequired`, `maxFiles`, `acceptedExtensionsOverride`, `position`) |

**Não gera nova versão:**

- `PATCH` de etapa alterando só `title`, `instructions`, `helpText`, `exampleUrl` (mesmo que o admin envie outros campos iguais ao estado atual)
- `PATCH` do workflow alterando só nome, descrição ou metadados de template (incluindo reenviar `isActive` sem mudança)

Submissões usam `workflowSnapshot` capturado na criação — independente do número de versão posterior.

## Endpoints — Etapas

### `POST /workflows/:id/steps`

Adiciona etapa. Se `position` omitido, adiciona ao final.

**Etapa DOCUMENT:**

```json
{
  "documentTypeId": "00000000-0000-0000-0000-000000000002",
  "title": "CPF",
  "instructions": "Envie frente e verso",
  "stepKind": "DOCUMENT",
  "conditionStepId": "uuid-da-etapa-anterior",
  "isRequired": true,
  "maxFiles": 1
}
```

**Etapa QUESTION:**

```json
{
  "title": "Tipo de cadastro",
  "stepKind": "QUESTION",
  "questionType": "SINGLE_CHOICE",
  "questionConfig": {
    "options": [
      { "id": "pf", "label": "Pessoa Física" },
      { "id": "pj", "label": "Pessoa Jurídica" }
    ]
  },
  "isRequired": true
}
```

**Etapa QUESTION (`MULTI_CHOICE`):**

```json
{
  "title": "Serviços de interesse",
  "stepKind": "QUESTION",
  "questionType": "MULTI_CHOICE",
  "questionConfig": {
    "options": [
      { "id": "opcao-1", "label": "Opção A" },
      { "id": "opcao-2", "label": "Opção B" }
    ],
    "minSelections": 1,
    "maxSelections": 2
  },
  "isRequired": true
}
```

| Campo | Regras |
|-------|--------|
| `documentTypeId` | Obrigatório em DOCUMENT; omitido ou null em QUESTION |
| `stepKind` | `DOCUMENT` (padrão) ou `QUESTION` |
| `questionType` | Obrigatório se `stepKind === QUESTION`; `MULTI_CHOICE` suportado |
| `questionConfig` | Validado conforme `questionType` (opções em `options[]`, min/max, limites de seleção em multi não podem exceder o número de opções) |
| `conditionStepId` | Deve referenciar etapa **anterior** (`position` menor) |
| `conditionValue` | Opcional; só válido se pré-requisito for QUESTION com opções e valor existente |

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

Ao mudar `stepKind` de DOCUMENT para QUESTION, uploads da etapa são removidos do disco e do banco.

### `DELETE /workflows/:id/steps/:stepId`

Remove etapa, limpa `conditionStepId` de etapas que a referenciavam, remove uploads da etapa e reindexa posições.

## Modelo de dados

Veja tabelas `workflows`, `workflow_steps` e `workflow_versions` em [banco-de-dados.md](../banco-de-dados.md).

## Lógica compartilhada

- Visibilidade de etapas: `packages/types/src/workflow-logic.ts`
- Diff entre versões: `packages/types/src/workflow-version-diff.ts`
- Snapshot: `apps/api/src/workflows/workflow-snapshot.util.ts`
