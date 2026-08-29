# Submissões — Lista (Admin)

**Rota:** `/submissions`  
**App:** Admin  
**Arquivo:** `apps/admin/src/app/submissions/page.tsx`

## Propósito

Visualizar todos os envios de documentos feitos pelos usuários finais nos workflows públicos.

## Funcionalidades

### Listagem (DataGrid)

| Coluna | Descrição |
|--------|-----------|
| ID | Identificador único da submissão (UUID) |
| Workflow | Nome do fluxo utilizado |
| Status | `IN_PROGRESS` ou `COMPLETED` |
| Arquivos | Total de uploads em todas as etapas |
| Iniciado em | Data/hora de criação |
| Concluído em | Data/hora de finalização (vazio se em andamento) |

### Navegação

Clique em qualquer linha para abrir o [detalhe da submissão](./detalhe-submissao.md).

## Lacunas de UI (dados na API, não exibidos)

- Coluna **Perfil** (`branchKey`) — não presente na listagem
- Respostas de etapas **CHOICE** — não listadas

## Status possíveis

| Status | Significado |
|--------|-------------|
| `IN_PROGRESS` | Usuário iniciou mas não finalizou |
| `COMPLETED` | Usuário concluiu o envio na etapa de revisão |

## API utilizada

- `GET /submissions`

Veja também: [api/submissoes-admin.md](../api/submissoes-admin.md)
