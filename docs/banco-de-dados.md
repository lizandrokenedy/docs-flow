# Banco de dados

**Schema:** `apps/api/prisma/schema.prisma`  
**Migration inicial:** `apps/api/prisma/migrations/20250828220000_init/`

## Diagrama de relacionamentos

```
DocumentType ──< WorkflowStep >── Workflow ──< Submission ──< StepUpload
                     │                              │
                     └──────────────────────────────┘
```

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

### `workflows`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| name | string | Título |
| slug | string | Único — usado na URL `/w/{slug}` |
| description | string? | Subtítulo no wizard |
| isActive | boolean | Padrão: false |
| createdAt, updatedAt | datetime | Auditoria |

### `workflow_steps`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| workflowId | UUID | FK → workflows (CASCADE) |
| documentTypeId | UUID | FK → document_types (RESTRICT) |
| title | string | Título da etapa |
| instructions | string? | Markdown |
| helpText | string? | Dica ao usuário |
| exampleUrl | string? | Link de exemplo |
| position | int | Ordem (único por workflow) |
| isRequired | boolean | Padrão: true |
| maxFiles | int | Padrão: 1 |
| acceptedExtensionsOverride | string[] | Override de extensões |
| createdAt, updatedAt | datetime | Auditoria |

**Índice único:** `(workflowId, position)`

### `submissions`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| workflowId | UUID | FK → workflows (CASCADE) |
| status | enum | `DRAFT`, `IN_PROGRESS`, `COMPLETED` |
| currentStepPosition | int | Etapa atual (0-based) |
| startedAt | datetime | Criação |
| completedAt | datetime? | Finalização |

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

## Migrations e seed

Executados automaticamente ao subir o container da API (`docker-compose.dev.yml` e `docker-compose.yml`).

Para rodar o seed manualmente no container:

```bash
docker exec docs-flow-api-1 sh -c "cd /app && npm run seed --workspace=@docs-flow/api"
```

Para recriar o banco do zero:

```bash
./scripts/build.sh down dev --volumes
./scripts/build.sh dev
```

## Seed

Veja [seed-e-exemplos.md](./seed-e-exemplos.md)
