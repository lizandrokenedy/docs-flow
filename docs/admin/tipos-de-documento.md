# Tipos de documento (Admin)

**Rota:** `/document-types`  
**App:** Admin  
**Arquivo:** `apps/admin/src/app/document-types/page.tsx`

## Propósito

Gerenciar o catálogo de tipos de documento reutilizáveis nas etapas dos workflows.

## Funcionalidades

### Listagem (DataGrid)

| Coluna | Descrição |
|--------|-----------|
| Nome | Identificador do tipo (ex.: RG, CPF) |
| Descrição | Texto explicativo |
| Formatos | Extensões aceitas em maiúsculas |
| Tamanho máx. | Limite por arquivo em MB |
| Ações | Editar / Excluir |

### Criar tipo

Botão **Novo Tipo** abre diálogo com:

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| Nome | Sim | Ex.: `RG` |
| Descrição | Não | Texto livre |
| Extensões aceitas | Sim | Separadas por vírgula: `pdf, jpg, png` |
| Tamanho máximo (MB) | Sim | Padrão: 10 MB |

As extensões são convertidas automaticamente em tipos MIME:

| Extensão | MIME |
|----------|------|
| pdf | application/pdf |
| jpg, jpeg | image/jpeg |
| png | image/png |

### Editar tipo

Mesmo formulário, pré-preenchido com dados existentes.

### Excluir tipo

Solicita confirmação. Falha se o tipo estiver vinculado a alguma etapa de workflow (restrição de FK no banco).

## Comportamento técnico

- Tamanho é configurado em **MB** no formulário e convertido para bytes (`maxSizeBytes`) na API
- Feedback via toast (Snackbar) em sucesso ou erro

## API utilizada

- `GET /document-types`
- `POST /document-types`
- `PATCH /document-types/:id`
- `DELETE /document-types/:id`

Veja também: [api/tipos-de-documento.md](../api/tipos-de-documento.md)
