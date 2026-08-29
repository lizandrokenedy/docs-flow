# Workflows — Lista (Admin)

**Rota:** `/workflows`  
**App:** Admin  
**Arquivo:** `apps/admin/src/app/workflows/page.tsx`

## Propósito

Listar, criar, duplicar e excluir workflows de coleta de documentos.

## Funcionalidades

### Listagem (DataGrid)

| Coluna | Descrição |
|--------|-----------|
| Nome | Título do workflow |
| Slug | Identificador da URL pública (`/w/{slug}`) |
| Versão | `version` do workflow |
| Status | Ativo ou Inativo |
| Etapas | Quantidade de steps |
| Submissões | Quantidade de envios recebidos |
| Ações | Editar / Duplicar / Abrir público / Copiar link / Excluir |

> Templates (`isTemplate: true`) **não** aparecem nesta lista — apenas na [biblioteca de templates](./biblioteca-templates.md).

### Criar workflow

Diálogo com nome e descrição. Slug gerado via `slugify`. Workflow criado **inativo** e sem etapas → redireciona ao editor.

### Biblioteca de templates

Botão **Biblioteca de templates** → `/workflows/templates`. Página dedicada com filtro por categoria, preview das etapas e criação via `POST /workflows/from-template/:id`.

Também acessível pelo item **Templates** no menu lateral.

### Duplicar

Ícone na linha do workflow → `POST /workflows/:id/duplicate`. Nova cópia inativa com slug `-copia`.

### Excluir workflow

- Confirmação obrigatória
- Aviso se houver submissões (uploads removidos em cascata)
- Toast de sucesso ou erro

## Ciclo de vida recomendado

1. Criar workflow ou usar template da biblioteca (inativo)
2. Adicionar etapas no editor (condicionais, ramificações)
3. Ativar quando pronto
4. Compartilhar link `/w/{slug}`
5. Acompanhar submissões e consultar histórico de alterações se necessário

## API utilizada

- `GET /workflows`
- `GET /workflows/templates`
- `POST /workflows`
- `POST /workflows/from-template/:templateId`
- `POST /workflows/:id/duplicate`
- `DELETE /workflows/:id`

Veja também: [editor-workflow.md](./editor-workflow.md), [biblioteca-templates.md](./biblioteca-templates.md), [api/workflows.md](../api/workflows.md)
