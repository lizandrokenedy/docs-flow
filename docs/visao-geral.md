# Visão geral

## O que é o Docs Flow

O Docs Flow é um sistema para **orquestrar a coleta de documentos** em processos que exigem vários arquivos, em ordem definida, com instruções claras para quem envia.

Casos de uso típicos:

- Abertura de conta com envio de RG, CPF e comprovante
- Inventário judicial com dezenas de certidões e comprovantes
- Homologação de fornecedores com fluxos diferentes para PF e PJ (via perguntas condicionais)
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
- **Versão** (`version`) — incrementa quando há submissões e o **fluxo** é alterado (não incrementa para mudanças só de texto/instruções)
- Lista ordenada de **etapas**

Só workflows **ativos** e **não-template** com pelo menos uma etapa ficam disponíveis publicamente em `/w/{slug}`.

### Etapa (step)

Um passo dentro do workflow. Cada etapa possui:

| Campo | Descrição |
|-------|-----------|
| `stepKind` | `DOCUMENT` (upload) ou `QUESTION` (pergunta) |
| `questionType` | Tipo da pergunta: `SINGLE_CHOICE`, `SELECT`, `YES_NO`, `TEXT`, `TEXTAREA`, `NUMBER`, `DATE`, `MULTI_CHOICE` |
| `questionConfig` | JSON com opções (`options[]`), placeholder, min/max e limites de seleção |
| `documentTypeId` | Obrigatório em etapas DOCUMENT; opcional (null) em QUESTION |
| Título, instruções, ajuda, exemplo | Conteúdo exibido no wizard |
| `isRequired` | Obrigatória ou opcional |
| `maxFiles` | Quantidade máxima de arquivos (etapas DOCUMENT) |
| `conditionStepId` | Etapa anterior que deve estar **preenchida** antes desta aparecer |
| `conditionValue` | Opcional — em escolha única, exige resposta exata; em `MULTI_CHOICE`, exige que a opção esteja entre as selecionadas |

#### Etapas condicionais

Uma etapa só entra na lista **navegável** do wizard quando a etapa referenciada em `conditionStepId` foi preenchida:

- **Pré-requisito DOCUMENT** → pelo menos um arquivo enviado naquela etapa
- **Pré-requisito QUESTION** → pergunta respondida; se `conditionValue` estiver definido, a resposta deve corresponder (match exato em escolha única; inclusão da opção em `MULTI_CHOICE`)

O **stepper** pode antecipar etapas de documentos em cadeia (com ícone de cadeado até liberar). Etapas que dependem de pergunta só aparecem após a resposta.

A **primeira etapa** do fluxo não pode ter condicional — só aparece a opção "Sempre visível" no admin.

Ao **reordenar** etapas, condicionais inválidas são **removidas automaticamente** pela API.

### Submissão

Uma execução do workflow por um usuário final. Armazena:

- Status (`IN_PROGRESS`, `COMPLETED`)
- Posição atual no fluxo (índice nas etapas **visíveis**, incluindo revisão)
- `workflowSnapshot` — cópia JSON do workflow no momento da criação (etapas congeladas)
- Arquivos enviados por etapa (`StepUpload`)
- Respostas de etapas QUESTION (`SubmissionAnswer`)

Submissões existentes usam o **snapshot**, não o workflow ao vivo — edições posteriores não alteram envios em andamento.

### Upload

Arquivo enviado em uma etapa **DOCUMENT** de uma submissão. Antes de gravar no disco, passa por **scan antivírus** (ClamAV). Fica armazenado no volume Docker e referenciado no banco.

## Fluxo de uso (admin)

1. Cadastrar **tipos de documento**
2. Criar um **workflow** (inicia inativo) ou usar a **biblioteca de templates**
3. Adicionar e ordenar **etapas** (documento, pergunta, condicionais)
4. **Ativar** o workflow
5. Compartilhar o link público `/w/{slug}`
6. Acompanhar **submissões**, ver respostas e documentos, **excluir** quando necessário
7. Consultar **histórico de alterações** no editor (quando há submissões e mudanças de fluxo)

## Fluxo de uso (usuário final)

1. Acessa o link `/w/{slug}`
2. Submissão criada automaticamente (com snapshot)
3. Percorre as etapas **visíveis** conforme progresso e respostas
4. Em etapas DOCUMENT: envia arquivos; em etapas QUESTION: responde conforme o tipo
5. Avança com **Próximo** (obrigatórias exigem preenchimento válido)
6. Revisa tudo na etapa final (com botão **Alterar** por etapa)
7. **Finaliza** o envio

A sessão é salva no navegador (`localStorage`) para retomar depois.

## O que já funciona no MVP

- Scan antivírus nos uploads (ClamAV no Docker, fail-closed)
- Workflows com etapas condicionais e **tipos de pergunta** (escolha única, select, sim/não, múltipla escolha, texto, número, data)
- Templates reutilizáveis, biblioteca com preview e duplicação de workflows
- Histórico de versões com diff legível no admin
- Versionamento por snapshot nas submissões
- Toast e copiar link no admin
- Detalhe de submissão com respostas e documentos; exclusão de submissão

## Limitações do MVP atual

Resumo das principais lacunas. Análise completa: **[roadmap-e-lacunas.md](./roadmap-e-lacunas.md)**.

- **Sem autenticação** no admin nem na API
- **Sem identificação do remetente** nas submissões (nome, e-mail, CPF)
- Armazenamento de arquivos **local** (volume Docker), sem S3/MinIO
- Sem notificações por e-mail
- Sem exportação em lote de submissões
- Sem testes automatizados nem CI
