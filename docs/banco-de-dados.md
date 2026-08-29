# Banco de dados

**Schema:** `apps/api/prisma/schema.prisma`  
**Migration:** `apps/api/prisma/migrations/20250829250000_baseline/`

## Diagrama de relacionamentos

```
DocumentType ──< WorkflowStep >── Workflow ──< Submission ──< StepUpload
                     │                │            │
                     │                │            ├──< SubmissionAnswer
                     │                │
                     │                └──< WorkflowVersion
                     └──────────────────────────────┘
```

## Enums

### `StepKind`

| Valor | Descrição |
|-------|-----------|
| `DOCUMENT` | Upload de arquivo(s) |
| `QUESTION` | Pergunta (tipo definido em `questionType`) |

### `QuestionType`

| Valor | UI / validação |
|-------|----------------|
| `SINGLE_CHOICE` | Radio buttons |
| `SELECT` | Lista suspensa |
| `YES_NO` | Sim / Não (opções fixas) |
| `TEXT` | Texto curto (máx. 255 caracteres) |
| `TEXTAREA` | Texto longo (máx. 5.000 caracteres) |
| `NUMBER` | Numérico com min/max opcionais |
| `DATE` | Data ISO (`YYYY-MM-DD`) |
| `MULTI_CHOICE` | No schema; **bloqueado** na API até Fase 5 |

### `SubmissionStatus`

| Valor | Uso atual |
|-------|-----------|
| `IN_PROGRESS` | Submissão em andamento |
| `COMPLETED` | Finalizada pelo usuário |
| `DRAFT` | Definido no schema, não utilizado |

## Tabelas

### `document_types`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| name | string | Nome do tipo |
| description | string? | Descrição |
| allowedExtensions | string[] | Ex.: `["pdf","jpg"]` |
| allowedMimeTypes | string[] | Ex.: `["application/pdf"]` |
| maxSizeBytes | int | Padrão: 10485760 (10 MB) |
| icon | string? | Nome de ícone MUI |
| createdAt, updatedAt | datetime | Auditoria |

No seed, IDs fixos usam formato `00000000-0000-0000-0000-00000000000N`.

### `workflows`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| name | string | Título |
| slug | string | Único — usado na URL `/w/{slug}` |
| description | string? | Subtítulo no wizard |
| isActive | boolean | Padrão: false |
| isTemplate | boolean | Padrão: false — templates não são públicos |
| templateCategory | string? | Ex.: `fornecedores`, `onboarding` |
| version | int | Padrão: 1 — incrementa ao alterar **fluxo** com submissões existentes |
| createdAt, updatedAt | datetime | Auditoria |

### `workflow_versions`

Arquivo de snapshots por versão (quando o workflow com submissões é alterado).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| workflowId | UUID | FK → workflows (CASCADE) |
| version | int | Número da versão arquivada |
| snapshot | JSON | `WorkflowSnapshot` antes do incremento |
| changeLabel | string? | Descrição da alteração (ex.: "Ordem das etapas alterada") |
| createdAt | datetime | Quando foi arquivada |

**Índice único:** `(workflowId, version)`

### `workflow_steps`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| workflowId | UUID | FK → workflows (CASCADE) |
| documentTypeId | UUID? | FK → document_types (RESTRICT); obrigatório em DOCUMENT |
| title | string | Título da etapa |
| instructions | string? | Markdown |
| helpText | string? | Dica ao usuário |
| exampleUrl | string? | Link de exemplo |
| position | int | Ordem (único por workflow) |
| stepKind | StepKind | Padrão: `DOCUMENT` |
| questionType | QuestionType? | Obrigatório quando `stepKind === QUESTION` |
| questionConfig | JSON? | Opções, placeholder, min/max, etc. |
| conditionStepId | string? | ID de etapa anterior que deve estar preenchida |
| conditionValue | string? | Opcional — exige resposta exata em pré-requisito QUESTION |
| choiceOptions | string[] | Labels das opções (sincronizado com `questionConfig.options`; depreciar depois) |
| isRequired | boolean | Padrão: true |
| maxFiles | int | Padrão: 1 |
| acceptedExtensionsOverride | string[] | Override de extensões |
| createdAt, updatedAt | datetime | Auditoria |

**Índice único:** `(workflowId, position)`

**Regras de condicional (API):** `conditionStepId` deve apontar para etapa com `position` menor. `conditionValue` só é válido se o pré-requisito for QUESTION com opções e o valor existir nelas.

### `submissions`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| workflowId | UUID | FK → workflows (CASCADE) |
| status | SubmissionStatus | |
| workflowSnapshot | JSON? | Cópia do workflow na criação da submissão |
| currentStepPosition | int | Índice na lista de etapas visíveis |
| startedAt | datetime | Criação |
| completedAt | datetime? | Finalização |

### `submission_answers`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| submissionId | UUID | FK → submissions (CASCADE) |
| workflowStepId | UUID | FK → workflow_steps (CASCADE) |
| value | string | Resposta da etapa QUESTION |
| createdAt, updatedAt | datetime | Auditoria |

**Índice único:** `(submissionId, workflowStepId)`

Respostas opcionais vazias removem o registro (não ficam com string vazia).

### `step_uploads`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| submissionId | UUID | FK → submissions (CASCADE) |
| workflowStepId | UUID | FK → workflow_steps (CASCADE) |
| originalName | string | Nome enviado pelo usuário |
| storedName | string | Nome no disco (UUID + ext) |
| mimeType | string | Tipo MIME |
| sizeBytes | int | Tamanho em bytes |
| createdAt | datetime | Upload |

## Snapshot (`workflowSnapshot`)

JSON capturado em `POST /public/workflows/:slug/submissions`. Estrutura definida em `packages/types/src/workflow-logic.ts` (`WorkflowSnapshot`):

- Metadados do workflow (`workflowId`, `name`, `slug`, `version`, `capturedAt`)
- Array `steps` com todos os campos necessários para renderizar o wizard sem consultar o workflow ao vivo (`stepKind`, `questionType`, `questionConfig`, condicionais, etc.)

A API resolve o workflow da submissão a partir do snapshot quando presente.

## Visibilidade de etapas

Lógica compartilhada em `packages/types/src/workflow-logic.ts`:

- `getVisibleSteps()` — filtra por condicionais e respostas/uploads
- `getStepperSteps()` — etapas exibidas no stepper (inclui documentos futuros em cadeia; oculta dependentes de pergunta)
- `getStepLockMessage()` — mensagem de bloqueio no stepper
- `isStepVisible()` — verifica pré-requisito preenchido
- `completedStepIdsFromUploads()` — etapas DOCUMENT concluídas
- `diffWorkflowSnapshots()` — compara dois snapshots e retorna lista de alterações legíveis

## Migrations e seed

Executados automaticamente ao subir o container da API (`docker-compose.dev.yml` e `docker-compose.yml`).

Para rodar o seed manualmente no container:

```bash
docker exec docs-flow-api-1 sh -c "cd /app && npm run seed --workspace=@docs-flow/api"
```

Para recriar o banco do zero:

```bash
npm run db:reset
# ou
./scripts/build.sh down dev --volumes
./scripts/build.sh dev
```

## Seed

Veja [seed-e-exemplos.md](./seed-e-exemplos.md)
