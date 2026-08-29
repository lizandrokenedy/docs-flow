# Visão geral

## O que é o Docs Flow

O Docs Flow é um sistema para **orquestrar a coleta de documentos** em processos que exigem vários arquivos, em ordem definida, com instruções claras para quem envia.

Casos de uso típicos:

- Abertura de conta com envio de RG, CPF e comprovante
- Inventário judicial com dezenas de certidões e comprovantes
- Homologação de fornecedores com fluxos diferentes para PF e PJ
- Qualquer processo interno que hoje recebe documentos por e-mail ou WhatsApp de forma desorganizada

## Conceitos principais

### Tipo de documento

Catálogo reutilizável de documentos (ex.: RG, CPF, Certidão de Óbito). Define:

- Nome e descrição
- Extensões aceitas (`pdf`, `jpg`, etc.)
- Tipos MIME correspondentes
- Tamanho máximo por arquivo (em MB)

### Workflow

Fluxo completo que o usuário final percorre. Possui:

- Nome, slug (URL amigável) e descrição
- Status ativo/inativo
- Flag **template** (`isTemplate`) — templates não aparecem em `/w/{slug}` até serem duplicados
- **Versão** (`version`) — incrementa quando o workflow é editado e já possui submissões
- Lista ordenada de **etapas**

Só workflows **ativos** e **não-template** com pelo menos uma etapa ficam disponíveis publicamente em `/w/{slug}`.

### Etapa (step)

Um passo dentro do workflow. Cada etapa possui:

| Campo | Descrição |
|-------|-----------|
| `stepKind` | `DOCUMENT` (upload de arquivo) ou `CHOICE` (pergunta com opções) |
| Tipo de documento | Referência ao catálogo (obrigatório no schema, mesmo em etapas CHOICE) |
| Título, instruções, ajuda, exemplo | Conteúdo exibido no wizard |
| `isRequired` | Obrigatória ou opcional |
| `maxFiles` | Quantidade máxima de arquivos (etapas DOCUMENT) |
| `branchKey` | Perfil/ramo (ex.: `pf`, `pj`, `herdeiro`) — etapa só aparece para quem escolheu esse perfil |
| `conditionStepId` | Etapa anterior que deve estar **preenchida** antes desta aparecer |
| `choiceOptions` | Opções de resposta (etapas CHOICE, mínimo 2) |

#### Etapas condicionais

Uma etapa só entra na lista visível do wizard quando a etapa referenciada em `conditionStepId` foi preenchida:

- **Pré-requisito DOCUMENT** → pelo menos um arquivo enviado naquela etapa
- **Pré-requisito CHOICE** → pergunta respondida; se `conditionValue` estiver definido (via API/seed), a resposta deve ser exatamente esse valor

A **primeira etapa** do fluxo não pode ter condicional — só aparece a opção "Sempre visível" no admin.

Ao **reordenar** etapas, condicionais que ficarem inválidas (pré-requisito na mesma posição ou depois) são **removidas automaticamente** pela API.

### Submissão

Uma execução do workflow por um usuário final. Armazena:

- Status (`IN_PROGRESS`, `COMPLETED`)
- Posição atual no fluxo (índice nas etapas **visíveis**, incluindo revisão)
- `branchKey` — perfil escolhido no início (quando o workflow tem ramificações)
- `workflowSnapshot` — cópia JSON do workflow no momento da criação (etapas congeladas)
- Arquivos enviados por etapa (`StepUpload`)
- Respostas de etapas CHOICE (`SubmissionAnswer`)

Submissões existentes usam o **snapshot**, não o workflow ao vivo — edições posteriores não alteram envios em andamento.

### Upload

Arquivo enviado em uma etapa **DOCUMENT** de uma submissão. Antes de gravar no disco, passa por **scan antivírus** (ClamAV). Fica armazenado no volume Docker e referenciado no banco.

## Fluxo de uso (admin)

1. Cadastrar **tipos de documento**
2. Criar um **workflow** (inicia inativo) ou **usar template**
3. Adicionar e ordenar **etapas** (documento, escolha, condicionais, ramificações)
4. Revisar no **preview**
5. **Ativar** o workflow
6. Compartilhar o link público `/w/{slug}`
7. Acompanhar **submissões** e baixar arquivos

## Fluxo de uso (usuário final)

1. Acessa o link `/w/{slug}`
2. Seleciona **perfil** (quando o workflow tem `branchKey` nas etapas)
3. Percorre apenas as etapas **visíveis** para seu perfil e progresso
4. Em etapas DOCUMENT: envia arquivos; em etapas CHOICE: escolhe uma opção
5. Avança com **Próximo** (obrigatórias exigem preenchimento)
6. Revisa tudo na etapa final (com botão **Alterar** por etapa)
7. **Finaliza** o envio

A sessão é salva no navegador (`localStorage`) para retomar depois.

## O que já funciona no MVP

- Scan antivírus nos uploads (ClamAV no Docker, fail-closed)
- Workflows com etapas condicionais, ramificações e escolhas
- Templates reutilizáveis e duplicação de workflows
- Versionamento por snapshot nas submissões
- Toast e copiar link no admin

## Limitações do MVP atual

Resumo das principais lacunas. Análise completa: **[roadmap-e-lacunas.md](./roadmap-e-lacunas.md)**.

- **Sem autenticação** no admin nem na API
- **Sem identificação do remetente** nas submissões (nome, e-mail, CPF)
- Armazenamento de arquivos **local** (volume Docker), sem S3/MinIO
- Sem notificações por e-mail
- Sem exportação em lote de submissões
- Admin não exibe perfil (`branchKey`) nem respostas CHOICE no detalhe da submissão
- Admin não expõe `conditionValue` (condicional por resposta específica em CHOICE — só via API/seed)
- Sem testes automatizados nem CI
