# API — Visão geral

**Base URL:** `http://localhost:4000`  
**Swagger:** `http://localhost:4000/api/docs`  
**Arquivo de entrada:** `apps/api/src/main.ts`

## Características

- Framework NestJS com validação global (`ValidationPipe`)
- CORS habilitado para `WEB_URL` e `ADMIN_URL`
- Arquivos estáticos em `/uploads`
- Documentação interativa Swagger em `/api/docs`
- **Sem autenticação** no MVP

## Módulos e prefixos

| Módulo | Prefixo | Documentação |
|--------|---------|--------------|
| Health | `/health` | [health.md](./health.md) |
| Document Types | `/document-types` | [tipos-de-documento.md](./tipos-de-documento.md) |
| Workflows | `/workflows` | [workflows.md](./workflows.md) |
| Submissions (admin) | `/submissions` | [submissoes-admin.md](./submissoes-admin.md) |
| Public | `/public` | [submissoes-publicas.md](./submissoes-publicas.md) |
| Uploads (serviço) | `/uploads/*` | [uploads.md](./uploads.md) |

## Formato de resposta

- Sucesso: JSON com dados da entidade
- Erro: `{ "statusCode": number, "message": string | string[] }`

## Códigos HTTP comuns

| Código | Situação |
|--------|----------|
| 200 | OK |
| 201 | Criado |
| 400 | Validação / regra de negócio |
| 404 | Recurso não encontrado |
| 409 | Conflito (ex.: slug duplicado) |

## Convenções

- IDs são UUIDs
- Datas em ISO 8601
- Tamanhos de arquivo sempre em **bytes** na API (`maxSizeBytes`)
- Posições de etapas começam em `0`
