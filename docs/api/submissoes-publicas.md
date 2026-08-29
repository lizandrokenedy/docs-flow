# API — Submissões (Público)

**Prefixo:** `/public`  
**Arquivos:** `apps/api/src/submissions/`

Endpoints consumidos pelo wizard público (`/w/[slug]`). Não exigem autenticação.

## Endpoints

### `GET /public/workflows/:slug`

Retorna workflow **ativo** com etapas e tipos de documento (campos públicos apenas).

- `404` se slug não existir ou workflow estiver inativo

### `POST /public/workflows/:slug/submissions`

Cria nova submissão:

```json
{
  "id": "uuid",
  "status": "IN_PROGRESS",
  "currentStepPosition": 0,
  "workflow": { ... },
  "uploads": []
}
```

### `GET /public/submissions/:id`

Estado atual da submissão para retomar o wizard.

### `PATCH /public/submissions/:id/step`

Atualiza posição atual do usuário no fluxo.

```json
{ "position": 3 }
```

### `POST /public/submissions/:id/steps/:stepId/upload`

Upload de arquivo (`multipart/form-data`, campo `file`).

**Validações:**

- Extensão e MIME conforme tipo de documento (ou override da etapa)
- Tamanho ≤ `maxSizeBytes` do tipo
- Quantidade de arquivos ≤ `maxFiles` da etapa
- Submissão não pode estar `COMPLETED`
- Scan antivírus (ClamAV) no buffer, antes de gravar no disco

**Erros de upload (exemplos):**

| HTTP | Mensagem | Causa |
|------|----------|-------|
| `400` | `Formato não aceito` | Extensão inválida |
| `400` | `Arquivo muito grande. Máximo: X MB` | Excede `maxSizeBytes` |
| `400` | `Arquivo rejeitado: possível malware detectado.` | ClamAV detectou ameaça |
| `400` | `Não foi possível verificar o arquivo com segurança.` | Resposta inesperada do scanner |
| `503` | `Verificação de segurança indisponível...` | ClamAV fora do ar (fail-closed) |

Detalhes do scan: [uploads.md](./uploads.md#antivírus-clamav)

**Resposta:**

```json
{
  "id": "uuid",
  "originalName": "rg.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 245760,
  "previewUrl": "/uploads/..."
}
```

### `DELETE /public/submissions/:id/steps/:stepId/uploads/:uploadId`

Remove arquivo do disco e do banco.

### `POST /public/submissions/:id/complete`

Finaliza a submissão.

**Validações:**

- Todas as etapas com `isRequired: true` devem ter ≥ 1 upload
- Etapas opcionais sem arquivo são permitidas

**Efeito:**

- `status` → `COMPLETED`
- `completedAt` → timestamp atual
- `currentStepPosition` → total de etapas

## Fluxo típico

```
POST /public/workflows/{slug}/submissions
  → loop: upload + PATCH step
  → POST /complete
```

Veja também: [web/wizard-documentos.md](../web/wizard-documentos.md)
