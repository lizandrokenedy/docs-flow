# Visão geral

## O que é o Docs Flow

O Docs Flow é um sistema para **orquestrar a coleta de documentos** em processos que exigem vários arquivos, em ordem definida, com instruções claras para quem envia.

Casos de uso típicos:

- Abertura de conta com envio de RG, CPF e comprovante
- Inventário judicial com dezenas de certidões e comprovantes
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
- Lista ordenada de **etapas**

Só workflows **ativos** com pelo menos uma etapa ficam disponíveis publicamente em `/w/{slug}`.

### Etapa (step)

Um passo dentro do workflow. Cada etapa:

- Referencia um tipo de documento
- Tem título e instruções (Markdown)
- Pode ter texto de ajuda e link de exemplo
- Pode ser obrigatória ou opcional
- Define quantos arquivos aceita (`maxFiles`)
- Pode restringir extensões além do tipo de documento

### Submissão

Uma execução do workflow por um usuário final. Armazena:

- Status (`IN_PROGRESS`, `COMPLETED`)
- Posição atual no fluxo
- Arquivos enviados por etapa

### Upload

Arquivo enviado em uma etapa de uma submissão. Antes de gravar no disco, passa por **scan antivírus** (ClamAV). Fica armazenado no volume Docker e referenciado no banco.

## Fluxo de uso (admin)

1. Cadastrar **tipos de documento**
2. Criar um **workflow** (inicia inativo)
3. Adicionar e ordenar **etapas**
4. Revisar no **preview**
5. **Ativar** o workflow
6. Compartilhar o link público `/w/{slug}`
7. Acompanhar **submissões** e baixar arquivos

## Fluxo de uso (usuário final)

1. Acessa o link `/w/{slug}`
2. Lê instruções de cada etapa
3. Envia um ou mais arquivos por etapa
4. Avança com **Próximo** (etapas opcionais podem ser puladas)
5. Revisa tudo na etapa final
6. **Finaliza** o envio

A sessão é salva no navegador (`localStorage`) para retomar depois.

## Limitações do MVP atual

Resumo das principais lacunas. Análise completa, priorização e ordem sugerida de implementação: **[roadmap-e-lacunas.md](./roadmap-e-lacunas.md)**.

- **Scan antivírus** nos uploads (ClamAV no Docker, fail-closed)
- **Sem autenticação** no admin nem na API
- **Sem identificação do remetente** nas submissões
- Armazenamento de arquivos **local** (volume Docker), sem S3/MinIO
- Sem notificações por e-mail
- Sem exportação em lote de submissões
- Sem testes automatizados nem CI
