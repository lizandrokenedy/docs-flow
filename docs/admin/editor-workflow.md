# Editor de workflow (Admin)

**Rota:** `/workflows/[id]`  
**App:** Admin  
**Arquivo:** `apps/admin/src/app/workflows/[id]/page.tsx`

## Propósito

Configurar um workflow completo: dados gerais, etapas ordenáveis e preview do fluxo público.

## Abas

### 1. Geral

| Campo | Descrição |
|-------|-----------|
| Nome | Título do workflow |
| Slug | URL pública; alteração bloqueada se já houver submissões |
| Descrição | Subtítulo no wizard |
| Ativo | Toggle `isActive` |
| Usar como template | `isTemplate` — não aparece em `/w/...` nem na lista principal |
| Categoria do template | `templateCategory` (habilitado só se for template) |

**Regras:**

- Não é possível ativar workflow sem pelo menos uma etapa
- Aviso se tentar ativar com 0 etapas
- Alerta quando o workflow tem submissões: edições incrementam `version`; submissões existentes usam snapshot

**Ações:** **Duplicar workflow**, abrir `/w/{slug}`, **copiar link** (quando ativo).

Feedback via **toast** (Snackbar).

### 2. Steps

Lista ordenável por **arrastar e soltar** (`@dnd-kit`). Cada item mostra:

- Posição, título, tipo (documento ou escolha)
- Ramificação e indicador **Condicional** quando aplicável
- Obrigatório / Opcional
- Botões editar e excluir

#### Adicionar / editar etapa

| Campo | Descrição |
|-------|-----------|
| Tipo de etapa | `DOCUMENT` ou `CHOICE` (pergunta) |
| Tipo de documento | Select com tipos cadastrados |
| Título | Nome exibido no stepper |
| Instruções | Markdown |
| Texto de ajuda | Dica em destaque |
| URL de exemplo | Link "Ver exemplo" |
| Ramificação (perfil) | Ex.: `herdeiro`, `pf`, `pj` — vazio = todos |
| Exibir somente após preencher… | Etapa anterior que deve estar preenchida; primeira etapa = só "Sempre visível" |
| Opções de escolha | CHOICE: separadas por vírgula (mín. 2) |
| Máx. arquivos | DOCUMENT |
| Extensões (override) | Opcional |
| Obrigatório | Se desligado, usuário pode avançar sem preenchimento |

**Condicionais:**

- Lista apenas etapas **anteriores** na ordem do fluxo
- Significa: "só aparece depois que a etapa selecionada tiver arquivo enviado ou pergunta respondida"
- Ao reordenar, condicionais inválidas são removidas pela API (toast de aviso)

**Limitação atual:** o admin **não** expõe `conditionValue` (ex.: mostrar etapa só se resposta for `"Sim"`). Isso funciona via API/seed — ver template Cadastro de Fornecedor.

**Reordenar:** arraste pelo ícone ⋮⋮; `PATCH /workflows/:id/steps/reorder`.

### 3. Preview

Simula `StepInstructions` para cada etapa (sem upload, sem filtro de ramificação/condicional).

## API utilizada

- `GET /workflows/:id`
- `PATCH /workflows/:id`
- `POST /workflows/:id/duplicate`
- `POST /workflows/:id/steps`
- `PATCH /workflows/:id/steps/:stepId`
- `DELETE /workflows/:id/steps/:stepId`
- `PATCH /workflows/:id/steps/reorder`
- `GET /document-types`
