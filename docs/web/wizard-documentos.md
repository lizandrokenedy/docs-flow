# Wizard de envio de documentos (Web)

**Rota:** `/w/[slug]`  
**App:** Web pública  
**Arquivo:** `apps/web/src/app/w/[slug]/page.tsx`

## Propósito

Fluxo guiado passo a passo para o usuário final enviar documentos de um workflow ativo.

## Fluxo completo

```
Carregar workflow
  → [Selecionar perfil] (se houver branchKey nas etapas)
  → Criar/retomar submissão (com snapshot)
  → Etapas visíveis 1..N
  → Revisão
  → Finalizar
  → Sucesso
```

### 1. Carregamento

- Busca workflow em `GET /public/workflows/{slug}`
- Se inativo ou inexistente: mensagem de erro

### 2. Seleção de perfil (opcional)

Quando alguma etapa possui `branchKey`, o componente `BranchPicker` é exibido **antes** das etapas de documento.

- Cria submissão com `POST /public/workflows/{slug}/submissions` + `{ "branchKey": "pf" }`
- Ou atualiza com `PATCH /public/submissions/{id}/branch`
- Labels amigáveis para `herdeiro`, `inventariante`, `advogado`; demais chaves aparecem como estão (`pf`, `pj`, etc.)

### 3. Persistência de sessão

Chave no `localStorage`: `docsflow_submission_{slug}`

- Salva o ID da submissão ao criar
- Ao recarregar a página, retoma a submissão existente
- Restaura a posição via `currentStepPosition` da API
- Remove a chave ao finalizar ou se a submissão for inválida

### 4. Etapas visíveis

O wizard **não** mostra todas as etapas do workflow — apenas as **visíveis** para o perfil e progresso atual (`getVisibleSteps` em `@docs-flow/types`):

| Filtro | Regra |
|--------|-------|
| Ramificação | Etapa com `branchKey` só aparece se igual ao perfil da submissão |
| Condicional | Etapa com `conditionStepId` só aparece após a etapa referenciada ser preenchida |

**Preenchimento:**

- Etapa **DOCUMENT** → pelo menos um upload na etapa
- Etapa **CHOICE** → resposta salva via API

### 5. Stepper de progresso

Componente `WorkflowStepper` — recebe apenas etapas **visíveis**:

- **< 6 etapas:** stepper horizontal (desktop) ou vertical (mobile)
- **≥ 6 etapas:** modo compacto com barra de progresso, contador "Etapa X de Y" e faixa rolável de ícones

**Regra de conclusão:** etapa só aparece como concluída após o usuário clicar em **Próximo**.

### 6. Cada etapa

#### Etapa DOCUMENT

- `StepInstructions` — título, instruções Markdown, ajuda, formatos e tamanho máximo
- `FileDropzone` — upload por arrastar, clique ou câmera (imagens)

**Upload:**

- Validação client-side: extensão e tamanho
- Upload via XHR com barra de progresso
- Scan antivírus no servidor (ClamAV)
- Múltiplos arquivos quando `maxFiles > 1`
- Preview de imagens; botão remover

#### Etapa CHOICE

- `ChoiceStep` — opções em radio buttons
- Sem upload de arquivo
- Ao clicar **Próximo**, salva resposta em `PATCH /public/submissions/{id}/steps/{stepId}/answer`

#### Navegação

| Botão | Comportamento |
|-------|---------------|
| Voltar | Etapa anterior; atualiza `currentStepPosition` na API |
| Próximo | Avança se obrigatória estiver preenchida (arquivo ou resposta CHOICE) |

Ao avançar após preencher uma etapa, novas etapas condicionais podem **entrar** na lista visível (stepper atualiza após refetch).

### 7. Etapa de revisão

Componente `UploadReview` — resumo das etapas **visíveis**:

- DOCUMENT: arquivos enviados
- CHOICE: texto `Resposta: {valor}`
- Botão **Alterar** por etapa — volta ao índice correspondente

Botão **Finalizar envio** chama `POST /public/submissions/{id}/complete`.

### 8. Tela de sucesso

Componente `SuccessScreen`:

- Confirmação de envio
- ID da submissão
- Botão **Iniciar novo envio**

## Validações na finalização

A API valida apenas etapas **visíveis** e **obrigatórias**:

- DOCUMENT: ≥ 1 upload
- CHOICE: resposta registrada

Etapas opcionais vazias são permitidas.

`currentStepPosition` após completar = quantidade de etapas visíveis (índice da revisão).

## Snapshot

Ao criar a submissão, a API grava `workflowSnapshot`. Submissões em andamento usam as etapas congeladas — alterações posteriores no admin não afetam o envio.

## API utilizada

Veja [api/submissoes-publicas.md](../api/submissoes-publicas.md)

## Workflows de exemplo

| Slug | Descrição |
|------|-----------|
| `abertura-conta` | 3 etapas em cadeia — RG → CPF → comprovante |
| `inventario-judicial` | 19 etapas — inventário judicial completo |

Detalhes em [seed-e-exemplos.md](../seed-e-exemplos.md)
