# API — Workflows

**Prefixo:** `/workflows`  
**Arquivos:** `apps/api/src/workflows/`

## Endpoints — Workflow

### `GET /workflows`

Lista workflows com etapas, tipos de documento e contagem de submissões.

### `GET /workflows/:id`

Workflow completo com etapas ordenadas por `position`.

### `POST /workflows`

```json
{
  "name": "Abertura de Conta",
  "slug": "abertura-conta",
  "description": "Envie seus documentos",
  "isActive": false
}
```

- `slug` deve ser único (regex: `^[a-z0-9]+(?:-[a-z0-9]+)*$`)
- `409 Conflict` se slug já existir

### `PATCH /workflows/:id`

Atualização parcial. Regras:

- Alterar `slug` bloqueado se workflow tiver submissões
- `isActive: true` exige pelo menos 1 etapa

### `DELETE /workflows/:id`

Remove workflow, etapas, submissões e uploads em cascata.

## Endpoints — Etapas

### `POST /workflows/:id/steps`

Adiciona etapa. Se `position` omitido, adiciona ao final.

```json
{
  "documentTypeId": "uuid",
  "title": "Documento de Identidade",
  "instructions": "Envie frente e verso",
  "helpText": "Use boa iluminação",
  "exampleUrl": "https://exemplo.com",
  "isRequired": true,
  "maxFiles": 1,
  "acceptedExtensionsOverride": ["pdf"]
}
```

### `PATCH /workflows/:id/steps/reorder`

Reordena etapas em transação.

```json
{
  "steps": [
    { "id": "uuid-1", "position": 0 },
    { "id": "uuid-2", "position": 1 }
  ]
}
```

### `PATCH /workflows/:id/steps/:stepId`

Atualização parcial da etapa.

### `DELETE /workflows/:id/steps/:stepId`

Remove etapa e reindexa posições das restantes.

## Modelo de dados

Veja tabelas `workflows` e `workflow_steps` em [banco-de-dados.md](../banco-de-dados.md).
