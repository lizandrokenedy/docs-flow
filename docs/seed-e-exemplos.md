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

| # | Etapa | Condição |
|---|-------|----------|
| 1 | Documento de Identidade (RG) | Sempre visível |
| 2 | CPF | Após upload do RG |
| 3 | Comprovante de Residência | Após upload do CPF |

No wizard, só a etapa 1 aparece inicialmente. Cada etapa seguinte entra no fluxo depois que a anterior foi preenchida.

> **Bancos já existentes:** o seed só cria etapas quando o workflow tem 0 steps. Para aplicar a cadeia condicional em instalações antigas, configure no admin ou recrie o banco com `--volumes`.

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

Cada etapa inclui instruções em Markdown contextualizadas para o processo de inventário no Brasil. Sem condicionais no seed — todas visíveis desde o início (stepper compacto com 19 etapas).

## Template: Cadastro de Fornecedor

| Campo | Valor |
|-------|-------|
| Slug | `template-cadastro-fornecedor` |
| Status | **Template** (inativo — não aparece em `/w/...` até duplicar) |
| Categoria | `fornecedores` |
| Etapas | 8 |

Template genérico de **homologação de fornecedores**. Demonstra:

- **Perguntas condicionais** em vez de ramificação por perfil fixo
- **YES_NO** sobre registro regulatório
- **SINGLE_CHOICE** para PF vs PJ — documentos diferentes conforme a resposta (`conditionValue`)
- **Etapa condicional** — certificado de conformidade só aparece se a resposta da etapa 1 for `"Sim"`

| # | Etapa | Tipo | Condição |
|---|-------|------|----------|
| 1 | Registro regulatório | QUESTION (`YES_NO`) | Sempre visível |
| 2 | Tipo PF / PJ | QUESTION (`SINGLE_CHOICE`) | Sempre visível |
| 3 | RG (PF) | DOCUMENT | Resposta etapa 2 = `"Pessoa Física"` |
| 4 | CPF (PF) | DOCUMENT | Resposta etapa 2 = `"Pessoa Física"` |
| 5 | Contrato social (PJ) | DOCUMENT | Resposta etapa 2 = `"Pessoa Jurídica"` |
| 6 | Certidões negativas (PJ) | DOCUMENT | Resposta etapa 2 = `"Pessoa Jurídica"` |
| 7 | Dados bancários | DOCUMENT | Sempre visível |
| 8 | Certificado de conformidade | DOCUMENT | Resposta etapa 1 = `"Sim"` |

Documentos PF/PJ usam `conditionStepId` + `conditionValue` na pergunta de tipo (etapa 2). O certificado regulatório depende da pergunta YES_NO (etapa 1).

**Como usar:** Admin → **Templates** (ou **Biblioteca de templates** na lista de workflows) → selecione *Cadastro de Fornecedor* → crie cópia → edite e ative.

## Executar manualmente

```bash
docker exec docs-flow-api-1 sh -c "cd /app && npm run seed --workspace=@docs-flow/api"
```

## Reset completo do banco

```bash
npm run db:reset
```

Equivale a derrubar volumes, migrar e rodar seed — útil após mudanças de schema ou para reaplicar etapas do seed.

## Comportamento idempotente

- Tipos de documento: `upsert` por ID fixo
- Workflows: `upsert` por slug (metadados atualizados; etapas não)
- Etapas: criadas apenas se o workflow ainda não tiver etapas (`count === 0`)

Isso evita duplicar etapas em reinicializações, mas também significa que alterações manuais no seed **não atualizam** etapas já existentes — use `npm run db:reset` ou edite via admin.
