# Detalhe da submissão (Admin)

**Rota:** `/submissions/[id]`  
**App:** Admin  
**Arquivo:** `apps/admin/src/app/submissions/[id]/page.tsx`

## Propósito

Inspecionar uma submissão específica: metadados, progresso, respostas e arquivos enviados por etapa. Excluir submissão e arquivos associados.

## Informações exibidas

### Cabeçalho

- ID da submissão (com botão **Copiar ID** e toast de confirmação)
- Status (chip colorido)
- Botão **Excluir submissão** (confirmação; redireciona à lista)
- Workflow vinculado
- Botões **Abrir fluxo público** e **Copiar link**
- Datas de início e conclusão
- Total de arquivos e respostas registradas

### Etapas

Lista agrupada por etapa do workflow (todas as etapas do snapshot/workflow — **não** filtradas por visibilidade):

**Etapas QUESTION:**

- Chip "Pergunta"
- Valor da resposta e data de registro
- "Nenhuma resposta registrada" se vazio

**Etapas DOCUMENT:**

- Chip "Documento"
- Para cada arquivo: nome original, tamanho, MIME, data, botões **Abrir** e **Baixar**
- "Nenhum arquivo enviado" se vazio

### URLs de arquivo

Os arquivos são servidos pela API:

```
{NEXT_PUBLIC_API_URL}/uploads/{submissionId}/{stepId}/{storedName}
```

## Casos de uso

- Conferir se o usuário enviou todos os documentos obrigatórios
- Ver respostas de perguntas (PF/PJ, Sim/Não, etc.)
- Baixar arquivos para análise manual
- Verificar submissões incompletas (`IN_PROGRESS`)
- Remover submissões de teste ou envios incorretos

## API utilizada

- `GET /submissions/:id`
- `DELETE /submissions/:id`

Veja também: [api/submissoes-admin.md](../api/submissoes-admin.md), [api/uploads.md](../api/uploads.md)
