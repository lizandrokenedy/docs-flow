# Wizard de envio de documentos (Web)

**Rota:** `/w/[slug]`  
**App:** Web pública  
**Arquivo:** `apps/web/src/app/w/[slug]/page.tsx`

## Propósito

Fluxo guiado passo a passo para o usuário final enviar documentos e responder perguntas de um workflow ativo.

## Fluxo completo

```
Carregar workflow
  → Criar/retomar submissão (com snapshot)
  → Etapas visíveis 1..N
  → Revisão
  → Finalizar
  → Sucesso
```

### 1. Carregamento

- Busca workflow em `GET /public/workflows/{slug}`
- Se inativo ou inexistente: mensagem de erro

### 2. Persistência de sessão

Chave no `localStorage`: `docsflow_submission_{slug}`

- Salva o ID da submissão ao criar
- Ao recarregar a página, retoma a submissão existente
- Restaura a posição via `currentStepPosition` da API (limitada às etapas visíveis)
- Remove a chave ao finalizar ou se a submissão for inválida

### 3. Etapas visíveis

O wizard navega apenas pelas etapas **visíveis** para o progresso atual (`getVisibleSteps` em `@docs-flow/types`):

| Filtro | Regra |
|--------|-------|
| Condicional | Etapa com `conditionStepId` só aparece após a etapa referenciada ser preenchida |
| `conditionValue` | Se definido, a resposta do pré-requisito deve ser exatamente esse valor |

**Preenchimento:**

- Etapa **DOCUMENT** → pelo menos um upload na etapa
- Etapa **QUESTION** → resposta válida salva via API

Ao mudar uma resposta que altera o ramo condicional, respostas e uploads de etapas que deixaram de ser visíveis são **removidos automaticamente** pela API.

### 4. Stepper de progresso

Componente `WorkflowStepper` — usa `getStepperSteps()` (pode incluir etapas futuras em cadeias de documentos):

- **< 6 etapas:** stepper horizontal (desktop) ou vertical (mobile)
- **≥ 6 etapas:** modo compacto com barra de progresso e ícones roláveis
- Etapas **bloqueadas** exibem ícone de cadeado e mensagem do tipo *Libera ao preencher "RG"*
- Etapas que dependem de pergunta só entram no stepper após a resposta
- Na **revisão**, modo compacto mostra "Revisão do envio"

O stepper reage em tempo real à resposta sendo editada (preview antes de salvar).

### 5. Cada etapa

#### Etapa DOCUMENT

- `StepInstructions` — título, instruções Markdown, ajuda, formatos e tamanho máximo (sem exibir "Tipo: ..." ao usuário)
- `FileDropzone` — upload por arrastar, clique ou câmera (imagens)

#### Etapa QUESTION

Componente `QuestionStep` — renderização por `questionType`:

| Tipo | UI |
|------|-----|
| `SINGLE_CHOICE` / `YES_NO` | Radio buttons (`ChoiceStep` em card) |
| `SELECT` | Lista suspensa |
| `TEXT` | Campo de texto curto (máx. 255 caracteres) |
| `TEXTAREA` | Texto longo (máx. 5.000 caracteres) |
| `NUMBER` | Campo numérico com min/max configuráveis |
| `DATE` | Seletor de data (ISO `YYYY-MM-DD`) |

Ao clicar **Próximo**, salva resposta em `PATCH /public/submissions/{id}/steps/{stepId}/answer`. Erros de validação aparecem em alerta.

#### Navegação

| Botão | Comportamento |
|-------|---------------|
| Voltar | Etapa anterior; atualiza `currentStepPosition` na API |
| Próximo | Valida no client e no servidor; avança se obrigatória estiver preenchida |

### 6. Etapa de revisão

Componente `UploadReview` — resumo das etapas **visíveis**:

- DOCUMENT: arquivos enviados
- QUESTION: texto `Resposta: {valor}`
- Botão **Alterar** por etapa — volta ao índice correspondente

Botão **Finalizar envio** chama `POST /public/submissions/{id}/complete`.

### 7. Tela de sucesso

Componente `SuccessScreen` — confirmação, ID da submissão e opção de novo envio.

## Validações na finalização

A API valida apenas etapas **visíveis** e **obrigatórias**:

- DOCUMENT: ≥ 1 upload
- QUESTION: resposta registrada e válida para o `questionType`

## Snapshot

Ao criar a submissão, a API grava `workflowSnapshot`. Submissões em andamento usam as etapas congeladas.

## API utilizada

Veja [api/submissoes-publicas.md](../api/submissoes-publicas.md)

## Workflows de exemplo

| Slug | Descrição |
|------|-----------|
| `abertura-conta` | 3 documentos em cadeia — RG → CPF → comprovante |
| `inventario-judicial` | 19 etapas — inventário judicial completo |
| `template-cadastro-fornecedor` | Template com perguntas PF/PJ e docs condicionais |

Detalhes em [seed-e-exemplos.md](../seed-e-exemplos.md)
