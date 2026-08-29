# Biblioteca de templates (Admin)

**Rota:** `/workflows/templates`  
**App:** Admin  
**Arquivo:** `apps/admin/src/app/workflows/templates/page.tsx`

## Propósito

Explorar workflows marcados como template (`isTemplate: true`), visualizar etapas antes de criar uma cópia e gerar um novo workflow a partir do modelo.

## Acesso

- Menu lateral → **Templates**
- Lista de workflows → botão **Biblioteca de templates**

## Funcionalidades

### Listagem e filtro

- Cards com nome, descrição, quantidade de etapas e categoria (`templateCategory`)
- Chips de filtro por categoria (quando existir)
- Seleção de template no painel esquerdo; preview no painel direito

### Preview das etapas

- Chips navegáveis por etapa (1, 2, 3…)
- Componente `StepInstructions` com instruções, ajuda e formatos aceitos
- Indicadores de pergunta (`questionType`), condicional e tipo documento

### Criar workflow a partir do template

| Campo | Descrição |
|-------|-----------|
| Nome do novo workflow | Preenchido automaticamente com sufixo `(novo)` |
| Slug | Gerado a partir do nome; editável |

Botão **Criar workflow a partir deste template** → `POST /workflows/from-template/:templateId` → redireciona ao editor do novo workflow (inativo, `isTemplate: false`).

## Templates no seed

O seed inclui **Cadastro de Fornecedor** (`template-cadastro-fornecedor`, categoria `fornecedores`). Veja [seed-e-exemplos.md](../seed-e-exemplos.md).

## API utilizada

- `GET /workflows/templates`
- `POST /workflows/from-template/:templateId`

Veja também: [api/workflows.md](../api/workflows.md), [workflows.md](./workflows.md)
