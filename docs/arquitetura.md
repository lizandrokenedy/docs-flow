# Arquitetura

## Monorepo

O projeto usa **npm workspaces**:

```
docs-flow/
├── apps/
│   ├── api/          # NestJS + Prisma
│   ├── admin/        # Next.js 15 — painel administrativo
│   └── web/          # Next.js 15 — wizard público
├── packages/
│   ├── types/        # Schemas Zod, tipos TS, utilitários
│   └── ui/           # Componentes MUI compartilhados
├── scripts/          # build.sh, docker-install.sh, docker-clean-artifacts.sh, …
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

- Schemas Zod e tipos TypeScript (`Workflow`, `WorkflowStep`, `Submission`, `QuestionType`, etc.)
- Utilitários: `slugify`, `formatFileSize`, `bytesToMegabytes`, `getStepAcceptedExtensions`
- **Lógica de workflow** (`workflow-logic.ts`): `getVisibleSteps`, `getStepperSteps`, `getStepLockMessage`, `isStepVisible`, `completedStepIdsFromUploads`, `WorkflowSnapshot`
- **Tipos de pergunta** (`question.ts`): `QuestionType`, `validateQuestionAnswer`, `sanitizeQuestionConfig`, `getMultiChoiceConfigError`, etc.
- **Diff de versões** (`workflow-version-diff.ts`): `diffWorkflowSnapshots`, `WorkflowVersionChange`

Usado pela API, web e admin para manter regras de visibilidade e validação consistentes.

### Como o pacote é consumido

| App | Resolução em dev |
|-----|------------------|
| API (NestJS) | Dependência de workspace em `package.json`; tipos em `packages/types/dist/` após build |
| Web / Admin (Next.js) | `transpilePackages: ['@docs-flow/types']` no `next.config.js` |
| Jest (API) | `moduleNameMapper` aponta ao source em `packages/types/src/` (só nos testes) |

No desenvolvimento com Docker, o serviço `install` compila o pacote e popula `node_modules/@docs-flow/types` no host — não é preciso alterar `tsconfig` da API nem instalar npm localmente.

## Pacote `@docs-flow/ui`

Componentes visuais reutilizados no wizard público e na biblioteca de templates:

- `WorkflowStepper`, `StepInstructions`, `FileDropzone`, `StepCard`
- `UploadReview`, `SuccessScreen`, `AnimatedStepPanel`
- `QuestionStep` (wrapper por `questionType`), `ChoiceStep` (radio interno)
- `docsFlowTheme` (tema MUI)

## API — módulos NestJS

| Módulo | Responsabilidade |
|--------|------------------|
| `PrismaModule` | Cliente Prisma global |
| `DocumentTypesModule` | CRUD de tipos de documento |
| `WorkflowsModule` | CRUD de workflows e etapas |
| `SubmissionsModule` | Submissões admin + endpoints públicos |
| `UploadsModule` | Validação, scan antivírus, persistência e limpeza de arquivos |
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

| Compose | Projeto Compose | Uso |
|---------|-----------------|-----|
| `docker-compose.dev.yml` | `docs-flow-dev` | Dev com hot-reload e bind mount do código |
| `docker-compose.yml` | `docs-flow-prod` | Build de imagens e prod local |
| `docker-compose.test.yml` | `docs-flow-test` | Stack isolada para Jest |

Script unificado: `./scripts/build.sh dev|prod|down` (atalhos: `npm run dev`, `npm run prod`, `npm run down`).

**Volumes persistentes (dev vs prod):** banco e uploads usam volumes Docker distintos — dados de um ambiente não aparecem no outro. Ver [instalacao.md](./instalacao.md#dev-e-prod-isolados).

Reset completo do banco **dev**: `npm run db:reset`

Testes automatizados: `npm run test` (requer `.env.test` — veja [instalacao.md](./instalacao.md#testes-automatizados))
