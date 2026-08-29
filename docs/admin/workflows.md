# Workflows — Lista (Admin)

**Rota:** `/workflows`  
**App:** Admin  
**Arquivo:** `apps/admin/src/app/workflows/page.tsx`

## Propósito

Listar, criar e excluir workflows de coleta de documentos.

## Funcionalidades

### Listagem (DataGrid)

| Coluna | Descrição |
|--------|-----------|
| Nome | Título do workflow |
| Slug | Identificador da URL pública (`/w/{slug}`) |
| Status | Ativo ou Inativo |
| Etapas | Quantidade de steps |
| Submissões | Quantidade de envios recebidos |
| Ações | Editar / Abrir público / Copiar link / Excluir |

### Criar workflow

Diálogo com:

| Campo | Descrição |
|-------|-----------|
| Nome | Gera slug automaticamente via `slugify` (ex.: "Abertura de Conta" → `abertura-conta`) |
| Descrição | Texto exibido no topo do wizard público |

O workflow é criado **inativo** e sem etapas. Após salvar, redireciona para o editor.

### Excluir workflow

- Confirmação obrigatória
- Se houver submissões, exibe aviso de que uploads serão removidos em cascata
- Remove workflow, etapas, submissões e arquivos associados
- Toast de sucesso ou erro após a operação

## Ciclo de vida recomendado

1. Criar workflow (inativo)
2. Adicionar etapas no editor
3. Testar no preview
4. Ativar quando pronto
5. Compartilhar link `/w/{slug}`

## API utilizada

- `GET /workflows`
- `POST /workflows`
- `DELETE /workflows/:id`

Veja também: [editor-workflow.md](./editor-workflow.md), [api/workflows.md](../api/workflows.md)
