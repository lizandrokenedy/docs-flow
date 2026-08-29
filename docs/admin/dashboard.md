# Dashboard

**Rota:** `/`  
**App:** Admin (`http://localhost:3001`)  
**Arquivo:** `apps/admin/src/app/page.tsx`

## Propósito

Tela inicial do painel administrativo com visão consolidada do sistema.

## Conteúdo

### Cards de métricas

- **Workflows ativos** — quantidade de workflows com `isActive = true`
- **Total de workflows** — todos os workflows cadastrados
- **Submissões** — total de envios recebidos

### Lista de workflows

Cards com:

- Nome e descrição
- Chip de status (Ativo / Inativo)
- Quantidade de etapas e submissões
- Botão **Editar** → `/workflows/{id}`
- Botão **Abrir público** → `{NEXT_PUBLIC_WEB_URL}/w/{slug}` (somente se ativo)
- Botão **Copiar link** → copia a URL pública e exibe toast de confirmação

### Submissões recentes

Últimas 5 submissões com:

- ID truncado
- Nome do workflow
- Status (`IN_PROGRESS`, `COMPLETED`)
- Data de início
- Clique na linha → `/submissions/{id}`

## Navegação

Menu lateral (`AdminLayout`):

- Dashboard
- Tipos de Documento
- Workflows
- Templates
- Submissões

## API utilizada

- `GET /workflows`
- `GET /submissions`
