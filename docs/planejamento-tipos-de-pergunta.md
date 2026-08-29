# Planejamento: tipos de pergunta no workflow

## Status da implementação (atualizado)

| Fase | Escopo | Status |
|------|--------|--------|
| 0 | Alinhamento | ✅ Concluída |
| 1 | Schema `QUESTION`, types, API workflows/submissions, baseline migration | ✅ Concluída |
| 2 | Admin builder (opções, select, yes/no) | ✅ Concluída |
| 3 | Wizard (`QuestionStep`, validação, revisão) | ✅ Concluída |
| 4 | TEXT, TEXTAREA, NUMBER, DATE | ✅ Concluída |
| 5 | MULTI_CHOICE + `conditionValue` no admin | ⏳ Pendente |
| 6 | Polish: remover `choiceOptions` duplicado, docs finais | ⏳ Parcial (docs em revisão) |

**Removido do modelo:** `branchKey`, `CHOICE`, `BranchPicker`, `PATCH .../branch` — ramificação PF/PJ agora via perguntas condicionais (`conditionValue`).

**Próximo passo:** Fase 5 — `MULTI_CHOICE` e campo `conditionValue` no editor de etapas.

---

## Objetivo

Evoluir etapas de pergunta de um único formato (`CHOICE` + radio + opções em texto) para um modelo flexível com **tipos de pergunta** configuráveis no admin e renderização/validação correta no wizard.

**Resultado esperado:** ao escolher "Pergunta" no editor, o admin define o **tipo** (escolha única, select, múltipla, texto, etc.) e vê um formulário adaptado (ex.: lista de opções com +/−). O usuário final responde no wizard; condicionais e snapshot continuam funcionando.

---

## Decisões de arquitetura (recomendadas)

### 1. Dois níveis, não um enum gigante em `stepKind`

| Campo | Valores | Papel |
|-------|---------|--------|
| `stepKind` | `DOCUMENT` \| `QUESTION` | Upload vs pergunta |
| `questionType` | ver abaixo | Como a pergunta é exibida e validada |
| `questionConfig` | JSON | Opções, placeholder, min/max, etc. |

**Migração:** `CHOICE` → `QUESTION` + `questionType: SINGLE_CHOICE` + `choiceOptions` copiadas para `questionConfig.options`.

Manter `CHOICE` como alias legado na API por 1 release (aceitar nos DTOs, gravar como `QUESTION`) ou migrar tudo de uma vez se o projeto ainda é MVP interno.

### 2. Tipos na v1 vs v2

**Fase 1 (MVP da feature)**

- `SINGLE_CHOICE`
- `SELECT`
- `YES_NO`

Comportamento igual ao CHOICE atual, só muda a UI.

**Fase 2**

- `TEXT`
- `TEXTAREA`
- `NUMBER`
- `DATE`

**Fase 3**

- `MULTI_CHOICE` (checkbox)
- Condicionais por opção em multi
- Operadores extras

### 3. Armazenamento da resposta

Hoje: `SubmissionAnswer.value` (string).

| Tipo | Armazenamento proposto |
|------|------------------------|
| Escolha única, select, yes/no, texto, número, data | `value` string (número/data em formato canônico, ex. ISO date) |
| Múltipla escolha | `value` JSON stringificado `["a","b"]` **ou** nova coluna `values Json` |

Recomendação: **Fases 1–2 só `value` string**; **Fase 3** adicionar `values Json?` opcional para multi (mais limpo que parsear JSON na string).

### 4. `questionConfig` (schema sugerido)

```ts
type QuestionOption = { id: string; label: string };

type QuestionConfig = {
  options?: QuestionOption[];      // choice, select, multi
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  minSelections?: number;          // multi
  maxSelections?: number;
};
```

Manter `choiceOptions: string[]` no banco temporariamente em sync com `questionConfig.options[].label` para não quebrar seeds/API antiga, e depreciar depois.

### 5. Condicionais

| Pré-requisito | "Preenchido" significa |
|---------------|------------------------|
| DOCUMENT | tem upload |
| QUESTION (texto/número/data) | `value` não vazio |
| QUESTION (escolha única) | tem resposta; `conditionValue` = match exato |
| QUESTION (multi) | Fase 3: `conditionValue` ∈ valores selecionados |

Fase 1: mesma lógica do CHOICE atual.

---

## Modelo de dados (Prisma)

```prisma
enum StepKind {
  DOCUMENT
  QUESTION
  // CHOICE removido após migração de dados
}

enum QuestionType {
  SINGLE_CHOICE
  SELECT
  YES_NO
  TEXT
  TEXTAREA
  NUMBER
  DATE
  MULTI_CHOICE
}

model WorkflowStep {
  // ...
  stepKind       StepKind      @default(DOCUMENT)
  questionType   QuestionType?
  questionConfig Json?
  choiceOptions  String[]      // deprecar após migração
}
```

**Migration SQL:**

- Adicionar enum + colunas
- `UPDATE workflow_steps SET step_kind = 'QUESTION', question_type = 'SINGLE_CHOICE' WHERE step_kind = 'CHOICE'`
- Popular `questionConfig` a partir de `choiceOptions`
- Template fornecedor: etapa 1 → `YES_NO` ou manter `SINGLE_CHOICE` com Sim/Não

**Snapshot (`WorkflowSnapshot`):** incluir `questionType` e `questionConfig` em cada step.

---

## Camadas afetadas

```
packages/types/     schemas Zod, workflow-logic, snapshot, version-diff
packages/ui/        QuestionStep (genérico), subcomponentes por tipo
apps/api/           schema, DTOs, workflows.service, submissions.service, seed
apps/admin/         editor de step (builder adaptativo)
apps/web/           wizard: render + save answer por tipo
docs/               visão geral, editor, API, roadmap
```

---

## Fases de implementação

### Fase 0 — Alinhamento (0,5 dia) ✅

- [x] Fechar lista de `QuestionType` da v1 (SINGLE_CHOICE, SELECT, YES_NO)
- [x] Fechar schema `questionConfig` e validação Zod compartilhada
- [x] Renomear CHOICE → QUESTION de uma vez (sem retrocompat)
- [x] Cenários de aceite: abertura-conta, template fornecedor, pergunta texto

### Fase 1 — Fundação (2–3 dias) ✅

**1.1 Banco e tipos**

- [x] Migration Prisma baseline (`QUESTION`, `QuestionType`, `questionConfig`)
- [x] `packages/types`: schemas e `WorkflowStepSchema`
- [x] `workflow-logic.ts`: `QUESTION` em pré-requisitos e visibilidade
- [x] `workflow-snapshot.util.ts` + `workflow-version-diff.ts`

**1.2 API**

- [x] DTOs e validação cruzada por `questionType`
- [x] `workflows.service`: criar/atualizar step com config
- [x] `submissions.service`: `saveStepAnswer` para QUESTION

**1.3 Testes manuais / smoke**

- [x] Seed sobe com `npm run db:reset`
- [x] Snapshot congela etapas na criação da submissão

### Fase 2 — Admin builder (2–3 dias) ✅

- [x] `QuestionOptionsEditor` (lista editável)
- [x] Tipo de documento opcional para QUESTION
- [x] Preview na biblioteca de templates
- [x] Chip/label com `questionType` na lista de steps

### Fase 3 — Wizard público (2 dias) ✅

- [x] `QuestionStep` (radio, select, yes/no)
- [x] Integração em `apps/web`
- [x] `UploadReview` com respostas
- [x] Validação obrigatória antes de Próximo

### Fase 4 — Tipos livres (2–3 dias) ✅

- [x] TEXT, TEXTAREA, NUMBER, DATE
- [x] Admin: `QuestionConfigEditor` (placeholder, min/max)
- [x] Limites padrão: TEXT 255, TEXTAREA 5000 caracteres
- [x] API: validação server-side

### Fase 5 — Múltipla escolha + condicionais (3–4 dias) ⏳

- [ ] `MULTI_CHOICE` + `values` em `SubmissionAnswer` (ou JSON em `value`)
- [ ] `StepAnswerMap` evolui para `Record<string, string | string[]>`
- [ ] `workflow-logic`: `conditionValue` com "inclui opção X"
- [ ] Admin: expor `conditionValue` no dropdown quando pré-requisito for escolha
- [ ] Version diff para multi

### Fase 6 — Polish e docs (1 dia) ⏳

- [x] Atualizar `docs/`, seed, exemplos
- [x] Roadmap: tipos de pergunta marcados como implementado (Fases 1–4)
- [ ] Remover `choiceOptions` duplicado (migration final) se `questionConfig` estiver estável

---

## Critérios de aceite (v1 completa)

1. Admin cria etapa **Pergunta → Lista (select)** com 3 opções via UI (+/−), sem vírgulas.
2. Wizard exibe `<Select>` e persiste resposta.
3. Etapa **Sim/Não** funciona sem configurar opções manualmente.
4. Template fornecedor continua funcionando após migração.
5. Condicional "após preencher pergunta X" e `conditionValue` (seed/API) intactos para escolha única.
6. Workflow com só DOCUMENT (abertura-conta) sem regressão.
7. Snapshot de submissão antiga ainda renderiza (fallback: sem `questionType` = `SINGLE_CHOICE`).

---

## Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Quebrar submissões em andamento | Snapshot imutável; fallback no wizard para steps sem `questionType` |
| `documentTypeId` obrigatório em pergunta texto | Manter tipo "Genérico" no seed ou campo oculto com default |
| Duplicar `choiceOptions` e `questionConfig` | Sync na API na Fase 1; remover `choiceOptions` na Fase 6 |
| Escopo inflar (todos os tipos de uma vez) | Entregar por fases; v1 só escolha com UI melhor |

---

## Fora de escopo (por ora)

- Perguntas com lógica AND/OR entre condições
- Perguntas condicionais aninhadas complexas
- Arrastar opções no builder (nice-to-have; reordenar por botões basta na v1)
- i18n dos labels fixos ("Selecione uma opção")
- Exibir respostas no detalhe da submissão no admin — **implementado**

---

## Ordem sugerida de PRs

| PR | Conteúdo | Tamanho |
|----|----------|---------|
| **PR1** | Schema + migration + types + snapshot + API workflows | Médio |
| **PR2** | API submissions + workflow-logic + compat CHOICE | Médio |
| **PR3** | Admin `QuestionOptionsEditor` + tipos v1 | Médio |
| **PR4** | UI wizard (radio/select/yes-no) + web integration | Médio |
| **PR5** | TEXT/TEXTAREA/NUMBER/DATE | Médio |
| **PR6** | MULTI_CHOICE + conditionValue no admin | Grande |

---

## Estimativa total

| Escopo | Esforço |
|--------|---------|
| Fases 0–3 (v1 utilizável) | ~6–8 dias |
| Fase 4 (campos livres) | +2–3 dias |
| Fase 5 (multi + condicionais UI) | +3–4 dias |
| **Total completo** | **~11–15 dias** |

---

## Próximo passo recomendado

Implementar **Fase 5**: `MULTI_CHOICE` no wizard e admin, e campo `conditionValue` no editor de condicionais.

---

## Referências no código atual

| Área | Arquivo |
|------|---------|
| Enum `StepKind` / `QuestionType` | `apps/api/prisma/schema.prisma` |
| Respostas | `SubmissionAnswer`, `PATCH .../steps/:stepId/answer` |
| Visibilidade condicional | `packages/types/src/workflow-logic.ts` |
| Wizard | `packages/ui/src/QuestionStep.tsx`, `apps/web/src/app/w/[slug]/page.tsx` |
| Editor admin | `QuestionOptionsEditor`, `QuestionConfigEditor`, `apps/admin/src/app/workflows/[id]/page.tsx` |
| Template exemplo | seed `template-cadastro-fornecedor` |
