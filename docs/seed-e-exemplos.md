# Dados de exemplo (seed)

**Arquivo:** `apps/api/prisma/seed.ts`

Script idempotente executado automaticamente ao subir o container da API no Docker.

## Tipos de documento (16)

| ID fixo | Nome |
|---------|------|
| ...001 | RG |
| ...002 | CPF |
| ...003 | Comprovante de Residência |
| ...004 | Certidão de Óbito |
| ...005 | Certidão Civil |
| ...006 | Pacto Antenupcial |
| ...007 | Declaração de Imposto de Renda |
| ...008 | Testamento / Certidão CENSEC |
| ...009 | Certidões Negativas |
| ...010 | Matrícula de Imóvel |
| ...011 | CRLV |
| ...012 | Extrato Bancário |
| ...013 | Documentos Societários |
| ...014 | Comprovante de Dívida |
| ...015 | Procuração |
| ...016 | Laudo ou Sentença de Interdição |

**Regras padrão:** `pdf, jpg, jpeg, png` — máximo 10 MB por arquivo.

## Workflow 1: Abertura de Conta

| Campo | Valor |
|-------|-------|
| Slug | `abertura-conta` |
| URL | http://localhost:3000/w/abertura-conta |
| Status | Ativo |
| Etapas | 3 (todas obrigatórias, 1 arquivo cada) |

1. Documento de Identidade (RG)
2. CPF
3. Comprovante de Residência

## Workflow 2: Inventário Judicial

| Campo | Valor |
|-------|-------|
| Slug | `inventario-judicial` |
| URL | http://localhost:3000/w/inventario-judicial |
| Status | Ativo |
| Etapas | 19 |

Fluxo completo para inventário judicial com disputa entre herdeiros:

| # | Etapa | Obrigatória | Max arquivos |
|---|-------|-------------|--------------|
| 1 | Certidão de Óbito | Sim | 1 |
| 2 | RG do Falecido | Sim | 2 |
| 3 | CPF do Falecido | Sim | 1 |
| 4 | Certidão de Casamento/Nascimento do Falecido | Sim | 1 |
| 5 | Pacto Antenupcial | Não | 1 |
| 6 | Última Declaração de IR | Sim | 3 |
| 7 | Testamento ou Certidão CENSEC | Sim | 2 |
| 8 | Certidões Negativas do Falecido | Sim | 8 |
| 9 | RG do Herdeiro | Sim | 2 |
| 10 | CPF do Herdeiro | Sim | 1 |
| 11 | Certidão do Herdeiro | Sim | 1 |
| 12 | Comprovante de Residência do Herdeiro | Sim | 1 |
| 13 | Laudo ou Sentença de Interdição | Não | 3 |
| 14 | Matrícula de Imóveis | Não | 10 |
| 15 | CRLV de Veículos | Não | 5 |
| 16 | Extratos Bancários | Não | 10 |
| 17 | Documentos Societários | Não | 8 |
| 18 | Comprovantes de Dívidas | Não | 10 |
| 19 | Procuração ao Advogado | Sim | 1 |

Cada etapa inclui instruções em Markdown contextualizadas para o processo de inventário no Brasil.

## Executar manualmente

```bash
docker exec docs-flow-api-1 sh -c "cd /app && npm run seed --workspace=@docs-flow/api"
```

## Comportamento idempotente

- Tipos de documento: `upsert` por ID fixo
- Workflows: `upsert` por slug
- Etapas: criadas apenas se o workflow ainda não tiver etapas (`count === 0`)

Isso evita duplicar etapas em reinicializações, mas também significa que alterações manuais no seed não atualizam etapas já existentes — é necessário recriar o banco ou editar via admin.
