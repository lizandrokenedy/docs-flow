# API — Uploads

**Arquivo:** `apps/api/src/uploads/uploads.service.ts`

Serviço interno responsável por validar, salvar e servir arquivos enviados.

## Armazenamento

### Estrutura no disco

```
{UPLOAD_DIR}/
  {submissionId}/
    {stepId}/
      {uuid}.{ext}
```

O nome original do arquivo é preservado apenas no banco (`originalName`). No disco usa-se UUID para evitar colisões.

### Servir arquivos

Configurado em `main.ts` como arquivos estáticos:

```
GET /uploads/{submissionId}/{stepId}/{storedName}
```

## Validações (`validateFile`)

| Regra | Erro |
|-------|------|
| Extensão não permitida | `Formato não aceito` |
| MIME não permitido | Validado indiretamente via extensão |
| Tamanho > maxSizeBytes | `Arquivo muito grande. Máximo: X MB` |
| Arquivos ≥ maxFiles | `Limite de N arquivo(s) atingido` |

Extensões aceitas são resolvidas por `getStepAcceptedExtensions()`:

1. `acceptedExtensionsOverride` da etapa (se preenchido)
2. Senão, `allowedExtensions` do tipo de documento

## Limite do Multer

Upload HTTP limitado a **50 MB** no middleware (independente do limite por tipo de documento).

## Remoção

`removeUpload` apaga o registro no banco e o arquivo físico.

## URLs no frontend

**Admin** (`apps/admin/src/lib/config.ts`):

```ts
getUploadUrl(submissionId, stepId, storedName)
// → {API_URL}/uploads/{submissionId}/{stepId}/{storedName}
```

**Web** — previews de imagem usam a mesma URL base.
