# API — Tipos de documento

**Prefixo:** `/document-types`  
**Arquivos:** `apps/api/src/document-types/`

## Endpoints

### `GET /document-types`

Lista todos os tipos, ordenados por nome.

### `GET /document-types/:id`

Retorna um tipo ou `404`.

### `POST /document-types`

Cria novo tipo.

**Body:**

```json
{
  "name": "RG",
  "description": "Documento de identidade",
  "allowedExtensions": ["pdf", "jpg", "png"],
  "allowedMimeTypes": ["application/pdf", "image/jpeg", "image/png"],
  "maxSizeBytes": 10485760,
  "icon": "badge"
}
```

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| name | string | Sim |
| description | string | Não |
| allowedExtensions | string[] | Sim |
| allowedMimeTypes | string[] | Sim |
| maxSizeBytes | number (bytes) | Sim |
| icon | string | Não |

### `PATCH /document-types/:id`

Atualização parcial dos campos acima.

### `DELETE /document-types/:id`

Remove o tipo. Retorna erro se estiver em uso por alguma etapa de workflow.

## Modelo de dados

Veja tabela `document_types` em [banco-de-dados.md](../banco-de-dados.md).
