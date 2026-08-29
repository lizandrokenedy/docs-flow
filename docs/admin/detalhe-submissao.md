# Detalhe da submissão (Admin)

**Rota:** `/submissions/[id]`  
**App:** Admin  
**Arquivo:** `apps/admin/src/app/submissions/[id]/page.tsx`

## Propósito

Inspecionar uma submissão específica: metadados, progresso e arquivos enviados por etapa.

## Informações exibidas

### Cabeçalho

- ID da submissão (com botão **Copiar ID** e toast de confirmação)
- Status (chip colorido)
- Workflow vinculado
- Botões **Abrir fluxo público** e **Copiar link**
- Datas de início e conclusão

> **Não exibido hoje:** perfil selecionado (`branchKey`) e respostas de etapas CHOICE (disponíveis na API).

### Arquivos por etapa

Lista agrupada por etapa do workflow (todas as etapas do snapshot/workflow — **não** filtradas por visibilidade):

- Título da etapa
- Chip Obrigatório / Opcional
- Para cada arquivo:
  - Nome original
  - Tamanho formatado
  - Tipo MIME
  - Data do upload
  - Botões **Abrir** e **Baixar**

### URLs de arquivo

Os arquivos são servidos pela API:

```
{NEXT_PUBLIC_API_URL}/uploads/{submissionId}/{stepId}/{storedName}
```

## Casos de uso

- Conferir se o usuário enviou todos os documentos obrigatórios
- Baixar arquivos para análise manual
- Verificar submissões incompletas (`IN_PROGRESS`)

## API utilizada

- `GET /submissions/:id`

Veja também: [api/submissoes-admin.md](../api/submissoes-admin.md), [api/uploads.md](../api/uploads.md)
