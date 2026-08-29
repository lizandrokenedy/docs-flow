# Editor de workflow (Admin)

**Rota:** `/workflows/[id]`  
**App:** Admin  
**Arquivo:** `apps/admin/src/app/workflows/[id]/page.tsx`

## Propósito

Configurar um workflow completo: dados gerais, etapas ordenáveis e histórico de alterações de fluxo.

## Abas

### 1. Geral

| Campo | Descrição |
|-------|-----------|
| Nome | Título do workflow |
| Slug | URL pública; alteração bloqueada se já houver submissões |
| Descrição | Subtítulo no wizard |
| Ativo | Toggle `isActive` — **único campo desta aba que incrementa versão** quando há submissões |
| Usar como template | `isTemplate` — não aparece em `/w/...` nem na lista principal |
| Categoria do template | `templateCategory` (habilitado só se for template) |

**Regras:**

- Não é possível ativar workflow sem pelo menos uma etapa
- Aviso se tentar ativar com 0 etapas
- Alterações em nome, descrição ou flags de template **não** geram nova versão
- Alerta quando o workflow tem submissões: alterações de **fluxo** incrementam `version`; submissões existentes usam snapshot

**Ações:** **Duplicar workflow**, abrir `/w/{slug}`, **copiar link** (quando ativo).

Feedback via **toast** (Snackbar).

### 2. Steps

Lista ordenável por **arrastar e soltar** (`@dnd-kit`). Cada item mostra:

- Posição, título, tipo (documento ou pergunta com `questionType`)
- Indicador **Condicional** quando aplicável
- Obrigatório / Opcional
- Botões editar e excluir

#### Adicionar / editar etapa

| Campo | Descrição |
|-------|-----------|
| Tipo de etapa | `DOCUMENT` ou `QUESTION` (pergunta) |
| Tipo de pergunta | `SINGLE_CHOICE`, `SELECT`, `YES_NO`, `TEXT`, `TEXTAREA`, `NUMBER`, `DATE` |
| Tipo de documento | Select com tipos cadastrados (obrigatório em DOCUMENT) |
| Título | Nome exibido no stepper |
| Instruções | Markdown |
| Texto de ajuda | Dica em destaque |
| URL de exemplo | Link "Ver exemplo" |
| Exibir somente após preencher… | Etapa anterior que deve estar preenchida; primeira etapa = só "Sempre visível" |
| Opções / config | Editor adaptativo (`QuestionOptionsEditor`, `QuestionConfigEditor`) |
| Máx. arquivos | DOCUMENT |
| Extensões (override) | Opcional |
| Obrigatório | Se desligado, usuário pode avançar sem preenchimento |

**UI por tipo de pergunta:**

| `questionType` | Campos no admin |
|----------------|-----------------|
| `SINGLE_CHOICE` / `SELECT` | Lista de opções editável (adicionar, remover, reordenar) |
| `YES_NO` | Somente título e instruções (opções Sim/Não fixas) |
| `TEXT` / `TEXTAREA` | Placeholder, min/max de caracteres |
| `NUMBER` | Min/max numérico |
| `DATE` | Sem config extra |

**Condicionais:**

- Lista apenas etapas **anteriores** na ordem do fluxo
- Significa: "só aparece depois que a etapa selecionada tiver arquivo enviado ou pergunta respondida"
- Ao reordenar, condicionais inválidas são removidas pela API (toast de aviso)

**O que gera nova versão** (quando já existem submissões):

- Adicionar, remover ou reordenar etapas
- Alterar condição, tipo de etapa, `questionType`, config, obrigatoriedade, tipo de documento, etc.

**O que não gera nova versão:**

- Título, instruções, dica rápida e URL de exemplo da etapa

**Limitação atual:** o admin **não** expõe `conditionValue` (ex.: mostrar etapa só se resposta for `"Sim"`). Isso funciona via API/seed — ver template Cadastro de Fornecedor.

**Reordenar:** arraste pelo ícone ⋮⋮; `PATCH /workflows/:id/steps/reorder`.

### 3. Histórico

Lista versões do workflow com **diff legível** do que mudou entre uma versão e a seguinte.

Exemplos de linhas exibidas:

- `2. CPF: exibição Sempre visível → Após preencher 1. Documento de Identidade (RG)`
- `3. Comprovante: posição 3 → 2`

**Quando aparece:** só após o workflow ter submissões e sofrer alterações de fluxo. Ajustes de texto/instruções não fragmentam o histórico.

**API:** `GET /workflows/:id/versions` e `GET /workflows/:id/versions/:versionNumber`.

## API utilizada

- `GET /workflows/:id`
- `PATCH /workflows/:id`
- `POST /workflows/:id/duplicate`
- `POST /workflows/:id/steps`
- `PATCH /workflows/:id/steps/:stepId`
- `DELETE /workflows/:id/steps/:stepId`
- `PATCH /workflows/:id/steps/reorder`
- `GET /workflows/:id/versions`
- `GET /workflows/:id/versions/:versionNumber`
- `GET /document-types`

Veja também: [api/workflows.md](../api/workflows.md)
