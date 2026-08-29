# Arquitetura

## Monorepo

O projeto usa **npm workspaces** + **Turborepo**:

```
docs-flow/
├── apps/
│   ├── api/          # NestJS + Prisma
│   ├── admin/        # Next.js 15 — painel administrativo
│   └── web/          # Next.js 15 — wizard público
├── packages/
│   ├── types/        # Schemas Zod, tipos TS, utilitários
│   └── ui/           # Componentes MUI compartilhados
├── scripts/          # build.sh, generate-eicar-test-pdf.sh, common.sh
└── docs/             # Esta documentação
```

## Stack

| Camada | Tecnologia |
|--------|------------|
| API | NestJS 11, Prisma 6, PostgreSQL 16 |
| Frontends | Next.js 15, React 19, MUI 7 |
| Estado (front) | TanStack Query |
| Validação | class-validator (API), Zod (types) |
| Upload | Multer + disco local |
| Antivírus | ClamAV (`clamav.client.ts`, protocolo INSTREAM) |
| Animações | Framer Motion |
| Drag-and-drop (admin) | @dnd-kit |
| Documentação API | Swagger (`/api/docs`) |

## Comunicação entre apps

```
┌─────────────┐     ┌─────────────┐
│   Admin     │     │    Web      │
│  :3001      │     │   :3000     │
└──────┬──────┘     └──────┬──────┘
       │                   │
       │  NEXT_PUBLIC_API_URL
       └─────────┬─────────┘
                 ▼
         ┌───────────────┐
         │   API :4000   │
         └───────┬───────┘
                 │
       ┌─────────┴─────────┐
       ▼                   ▼
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│ PostgreSQL  │     │ UPLOAD_DIR   │     │   ClamAV     │
│   :5433     │     │  (volume)    │     │   :3310      │
└─────────────┘     └──────────────┘     └──────────────┘
                                                ▲
                                                │ scan INSTREAM
                                                │ (antes de salvar)
```

Ambos os frontends importam `@docs-flow/ui` e `@docs-flow/types`.

## Pacote `@docs-flow/types`

Contratos compartilhados:

- Schemas Zod e tipos TypeScript (`Workflow`, `WorkflowStep`, `Submission`, etc.)
- Utilitários: `slugify`, `formatFileSize`, `bytesToMegabytes`, `getStepAcceptedExtensions`
- **Lógica de workflow** (`workflow-logic.ts`): `getVisibleSteps`, `isStepVisible`, `completedStepIdsFromUploads`, `getBranchOptions`, `WorkflowSnapshot`

Usado pela API, web e admin para manter regras de visibilidade consistentes.

## Pacote `@docs-flow/ui`

Componentes visuais reutilizados no wizard público e no preview do admin:

- `WorkflowStepper`, `StepInstructions`, `FileDropzone`
- `UploadReview`, `SuccessScreen`, `AnimatedStepPanel`
- `ChoiceStep`, `BranchPicker`, `formatBranchLabel`
- `docsFlowTheme` (tema MUI)

## API — módulos NestJS

| Módulo | Responsabilidade |
|--------|------------------|
| `PrismaModule` | Cliente Prisma global |
| `DocumentTypesModule` | CRUD de tipos de documento |
| `WorkflowsModule` | CRUD de workflows e etapas |
| `SubmissionsModule` | Submissões admin + endpoints públicos |
| `UploadsModule` | Validação, scan antivírus e persistência de arquivos |
| `HealthController` | Health check |

## Persistência de arquivos

Caminho no disco:

```
{UPLOAD_DIR}/{submissionId}/{stepId}/{uuid}.{ext}
```

Servidos estaticamente pela API em:

```
GET /uploads/{submissionId}/{stepId}/{storedName}
```

## Docker

- `docker-compose.dev.yml` — desenvolvimento com hot-reload e volumes montados
- `docker-compose.yml` — build de produção local

Script unificado: `./scripts/build.sh dev|prod|down`
