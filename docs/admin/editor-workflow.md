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

**Regras:**

- Não é possível ativar workflow sem pelo menos uma etapa
- Aviso exibido se tentar ativar com 0 etapas

**Link público:** botão para abrir `/w/{slug}` em nova aba (quando ativo).

### 2. Etapas

Lista ordenável por **arrastar e soltar** (`@dnd-kit`). Cada item mostra:

- Posição, título, tipo de documento
- Chip Obrigatório / Opcional
- Botões editar e excluir

#### Adicionar / editar etapa

| Campo | Descrição |
|-------|-----------|
| Tipo de documento | Select com tipos cadastrados |
| Título | Nome exibido no stepper |
| Instruções | Markdown — orientações ao usuário |
| Texto de ajuda | Dica em destaque (alerta azul) |
| URL de exemplo | Link "Ver exemplo" |
| Máx. arquivos | Quantos arquivos podem ser enviados nesta etapa |
| Extensões (override) | Opcional; substitui extensões do tipo de documento |
| Obrigatório | Se desligado, usuário pode avançar sem upload |

**Reordenar:** arraste pelo ícone ⋮⋮; posições são salvas via `PATCH /workflows/:id/steps/reorder`.

### 3. Preview

Simula a experiência do usuário final usando o componente `StepInstructions` para cada etapa, com:

- Título e tipo de documento
- Instruções renderizadas em Markdown
- Texto de ajuda
- Formatos aceitos e tamanho máximo

Não inclui upload real — apenas visualização das instruções.

## API utilizada

- `GET /workflows/:id`
- `PATCH /workflows/:id`
- `POST /workflows/:id/steps`
- `PATCH /workflows/:id/steps/:stepId`
- `DELETE /workflows/:id/steps/:stepId`
- `PATCH /workflows/:id/steps/reorder`
- `GET /document-types`
