# API — Submissões (Público)

**Prefixo:** `/public`  
**Arquivos:** `apps/api/src/submissions/`

Endpoints consumidos pelo wizard público (`/w/[slug]`). Não exigem autenticação.

## Endpoints

### `GET /public/workflows/:slug`

Retorna workflow **ativo** com etapas e tipos de documento.

- `404` se slug não existir ou workflow estiver inativo ou for template

### `POST /public/workflows/:slug/submissions`

Cria nova submissão com **snapshot** do workflow.

**Body:** vazio (sem campos obrigatórios).

**Resposta:**

```json
{
  "id": "uuid",
  "status": "IN_PROGRESS",
  "currentStepPosition": 0,
  "workflow": { "steps": [...] },
  "uploads": [],
  "answers": []
}
```

O `workflow` retornado já reflete o snapshot gravado.

### `GET /public/submissions/:id`

Estado atual para retomar o wizard. Workflow resolvido a partir do snapshot quando existir.

### `PATCH /public/submissions/:id/step`

Atualiza posição atual (índice nas etapas **visíveis**, 0-based; revisão = `visibleSteps.length`).

```json
{ "position": 2 }
```

### `PATCH /public/submissions/:id/steps/:stepId/answer`

Salva resposta de etapa **QUESTION**.

```json
{ "value": "Sim" }
```

Exemplo para `MULTI_CHOICE` (JSON stringificado):

```json
{ "value": "[\"Opção A\",\"Opção B\"]" }
```

- `400` se etapa não for QUESTION
- `400` se valor inválido para o `questionType` (opção inexistente, número fora do range, data inválida, seleções abaixo/acima do min/max em multi, etc.)
- Resposta vazia em etapa opcional **remove** o registro de resposta

Tipos suportados: `SINGLE_CHOICE`, `SELECT`, `YES_NO`, `TEXT`, `TEXTAREA`, `NUMBER`, `DATE`, `MULTI_CHOICE`.

### `POST /public/submissions/:id/steps/:stepId/upload`

Upload de arquivo (`multipart/form-data`, campo `file`) — apenas etapas **DOCUMENT**.

**Validações:**

- Extensão, MIME, tamanho, `maxFiles`
- Submissão não pode estar `COMPLETED`
- Scan antivírus (ClamAV) no buffer
- `400` se etapa for QUESTION

**Erros de upload (exemplos):**

| HTTP | Mensagem | Causa |
|------|----------|-------|
| `400` | `Formato não aceito` | Extensão inválida |
| `400` | `Arquivo muito grande...` | Excede `maxSizeBytes` |
| `400` | `Arquivo rejeitado: possível malware detectado.` | ClamAV |
| `400` | `Esta etapa é de pergunta...` | Upload em step QUESTION |
| `503` | `Verificação de segurança indisponível...` | ClamAV fora do ar |

Detalhes: [uploads.md](./uploads.md#antivírus-clamav)

### `DELETE /public/submissions/:id/steps/:stepId/uploads/:uploadId`

Remove arquivo do disco e do banco.

### `POST /public/submissions/:id/complete`

Finaliza a submissão.

**Validações (etapas visíveis e obrigatórias):**

- DOCUMENT: ≥ 1 upload
- QUESTION: resposta registrada e válida para o `questionType`

**Efeito:**

- `status` → `COMPLETED`
- `completedAt` → timestamp
- `currentStepPosition` → `visibleSteps.length`

## Visibilidade

A API e o wizard usam `getVisibleSteps()` (`@docs-flow/types`) com:

- `answers` (mapa stepId → valor)
- `completedStepIds` (steps com upload)

Ao salvar resposta que altera o ramo condicional, a API executa `cleanupHiddenBranchData` — remove respostas e uploads de etapas que deixaram de ser visíveis.

## Fluxo típico

```
GET /public/workflows/{slug}
  → POST /public/workflows/{slug}/submissions
  → loop: upload ou answer + PATCH step
  → POST /complete
```

Veja também: [web/wizard-documentos.md](../web/wizard-documentos.md)
