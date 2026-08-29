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

**Body (opcional):**

```json
{ "branchKey": "pf" }
```

Obrigatório quando o workflow possui etapas com `branchKey` e há opções de perfil disponíveis.

**Resposta:**

```json
{
  "id": "uuid",
  "status": "IN_PROGRESS",
  "branchKey": "pf",
  "currentStepPosition": 0,
  "workflow": { "steps": [...] },
  "uploads": [],
  "answers": []
}
```

O `workflow` retornado já reflete o snapshot gravado.

### `GET /public/submissions/:id`

Estado atual para retomar o wizard. Workflow resolvido a partir do snapshot quando existir.

### `PATCH /public/submissions/:id/branch`

Define ou altera o perfil da submissão.

```json
{ "branchKey": "pj" }
```

### `PATCH /public/submissions/:id/step`

Atualiza posição atual (índice nas etapas **visíveis**, 0-based; revisão = `visibleSteps.length`).

```json
{ "position": 2 }
```

### `PATCH /public/submissions/:id/steps/:stepId/answer`

Salva resposta de etapa **CHOICE**.

```json
{ "value": "Sim" }
```

- `400` se etapa não for CHOICE
- `400` se valor não estiver em `choiceOptions`

### `POST /public/submissions/:id/steps/:stepId/upload`

Upload de arquivo (`multipart/form-data`, campo `file`) — apenas etapas **DOCUMENT**.

**Validações:**

- Extensão, MIME, tamanho, `maxFiles`
- Submissão não pode estar `COMPLETED`
- Scan antivírus (ClamAV) no buffer
- `400` se etapa for CHOICE

**Erros de upload (exemplos):**

| HTTP | Mensagem | Causa |
|------|----------|-------|
| `400` | `Formato não aceito` | Extensão inválida |
| `400` | `Arquivo muito grande...` | Excede `maxSizeBytes` |
| `400` | `Arquivo rejeitado: possível malware detectado.` | ClamAV |
| `400` | `Esta etapa é de escolha...` | Upload em step CHOICE |
| `503` | `Verificação de segurança indisponível...` | ClamAV fora do ar |

Detalhes: [uploads.md](./uploads.md#antivírus-clamav)

### `DELETE /public/submissions/:id/steps/:stepId/uploads/:uploadId`

Remove arquivo do disco e do banco.

### `POST /public/submissions/:id/complete`

Finaliza a submissão.

**Validações (etapas visíveis e obrigatórias):**

- DOCUMENT: ≥ 1 upload
- CHOICE: resposta registrada

**Efeito:**

- `status` → `COMPLETED`
- `completedAt` → timestamp
- `currentStepPosition` → `visibleSteps.length`

## Visibilidade

A API e o wizard usam `getVisibleSteps()` (`@docs-flow/types`) com:

- `branchKey` da submissão
- `answers` (mapa stepId → valor)
- `completedStepIds` (steps com upload)

## Fluxo típico

```
GET /public/workflows/{slug}
  → [PATCH branch ou POST submissions com branchKey]
  → loop: upload ou answer + PATCH step
  → POST /complete
```

Veja também: [web/wizard-documentos.md](../web/wizard-documentos.md)
