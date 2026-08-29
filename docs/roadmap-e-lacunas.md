# Roadmap e lacunas do projeto

Este documento registra o que **já funciona**, o que **falta** e a **priorização sugerida** para evoluir o Docs Flow de MVP técnico para produto utilizável em produção (ex.: inventário judicial com vários herdeiros).

## Estado atual (o que já está pronto)

O sistema cobre o ciclo básico ponta a ponta:

1. Cadastrar tipos de documento
2. Criar e configurar workflows com etapas ordenáveis
3. Publicar link `/w/{slug}` para usuários finais
4. Wizard com upload, múltiplos arquivos por etapa, revisão e finalização
5. Acompanhar submissões, ver detalhe com arquivos e baixar no admin
6. Docker como única forma de execução documentada
7. Seed com workflows de exemplo (`abertura-conta`, `inventario-judicial`)
8. Scan antivírus nos uploads (ClamAV no Docker, fail-closed)
9. Stepper compacto para workflows longos (≥ 6 etapas)
10. Retomada de sessão no wizard (`localStorage` + `currentStepPosition`)
11. Feedback visual no admin (snackbar/toast em mutações, cópia de links e erros de carregamento)
12. Workflows inteligentes: duplicar, templates, etapas condicionais, ramificações e versionamento por snapshot

Para detalhes do que existe hoje, veja [visao-geral.md](./visao-geral.md).

---

## Prioridade 1 — Crítico (antes de produção)

Itens que impedem uso seguro em ambiente real.

### 1.1 Autenticação no admin

**Situação atual:** qualquer pessoa com acesso à URL do admin (`http://localhost:3001`) pode ver workflows, submissões e arquivos.

**O que falta:**

- Login de administradores (e-mail/senha, OAuth ou SSO)
- Proteção de rotas no Next.js (middleware)
- Tokens (JWT ou sessão) nas chamadas à API
- Papéis básicos (ex.: `admin`, `viewer`) — opcional na primeira versão

**Impacto:** sem isso, o sistema não deve ser exposto na internet.

---

### 1.2 Proteção da API e dos arquivos

**Situação atual:**

- Endpoints admin e públicos sem autenticação
- Arquivos servidos em URL previsível: `/uploads/{submissionId}/{stepId}/{storedName}`
- Sem rate limiting no upload

**O que falta:**

- Autenticação/autorização nos endpoints administrativos
- URLs de download **assinadas e temporárias** (ou proxy autenticado)
- Rate limiting em upload e criação de submissões
- Validação de origem (CORS já existe, mas não substitui auth)

**Impacto:** risco de vazamento de documentos sensíveis (RG, certidões, extratos).

---

### 1.3 Identificação de quem enviou

**Situação atual:** o modelo `Submission` armazena `workflowId`, status, posição, `branchKey` (perfil), snapshot, uploads e respostas CHOICE — mas **não** identifica a pessoa (nome, e-mail, CPF).

**O que falta:**

- Campos como nome, e-mail, CPF, telefone e observações
- Etapa inicial no wizard para identificação (ou formulário antes do fluxo)
- Em cenários com vários herdeiros: vínculo claro entre pessoa e submissão

**Impacto:** no inventário judicial, várias pessoas podem usar o mesmo link; sem identificação, não há como saber **quem** enviou cada documento.

**Sugestão de modelo (futuro):**

```
Submission
  submitterName
  submitterEmail
  submitterDocument   // CPF, opcional
  submitterPhone      // opcional
  notes               // opcional
```

---

### 1.4 Armazenamento escalável de arquivos

**Situação atual:** arquivos no volume Docker (`UPLOAD_DIR`), adequado para desenvolvimento.

**O que falta:**

- Integração com S3, MinIO ou equivalente
- Backup automatizado de uploads
- Política de retenção e exclusão
- Estratégia de migração do disco local para object storage

**Impacto:** perda de dados ao recriar volumes; dificuldade de escalar e fazer backup em produção.

---

## Prioridade 2 — Importante (experiência e operação)

Melhorias que aumentam muito o valor para escritórios, RH e operações.

### 2.1 Dados do envio no wizard público

**O que falta:**

- Tela de boas-vindas com identificação antes das etapas de documento
- Link único por participante (`/w/{slug}?token=...` ou `/w/{slug}/{inviteId}`)
- Validação de e-mail ou CPF antes de iniciar

**Relacionado a:** item 1.3 (identificação do remetente).

---

### 2.2 Admin mais operacional

**Situação atual:** listagem e detalhe com download de arquivos; link **Abrir público** e **Copiar link** no dashboard, lista de workflows, editor e detalhe da submissão (com toast). Sem ferramentas de produtividade abaixo.

**O que falta:**

| Feature | Descrição |
|---------|-----------|
| ~~Copiar link público~~ | Implementado (dashboard, workflows, editor, submissão) |
| Filtros | Por workflow, status, período |
| Busca | Por ID, nome do remetente (quando existir) |
| Download em ZIP | Baixar todos os arquivos de uma submissão de uma vez |
| Status operacionais | Além de `IN_PROGRESS` / `COMPLETED`: ex. `EM_ANALISE`, `PENDENTE`, `APROVADO` |
| Exportação | CSV/Excel de submissões para relatório |

---

### 2.3 Retomada entre dispositivos

**Situação atual:** sessão salva em `localStorage` (`docsflow_submission_{slug}`) no mesmo navegador.

**Limitações:**

- Trocar de celular para computador perde o progresso
- Limpar cache do navegador apaga a sessão
- Não há recuperação por e-mail

**O que falta:**

- Link mágico enviado por e-mail para retomar submissão
- Ou identificação + busca de submissão em andamento na API

---

### 2.4 Notificações

**Situação atual:** nenhuma notificação automática.

**O que falta:**

- E-mail ao admin quando uma submissão é finalizada
- E-mail de confirmação ao usuário com ID/protocolo do envio
- (Opcional) lembrete de submissão incompleta após X dias

**Dependências:** serviço de e-mail (SMTP, SendGrid, SES, etc.) e variáveis de ambiente.

---

### 2.5 Testes automatizados e CI

**Situação atual:**

- Nenhum arquivo `*.spec.ts` ou `*.test.ts` no repositório
- Nenhum pipeline `.github/workflows`
- Sem ESLint compartilhado (`packages/eslint-config` planejado, não implementado)

**O que falta:**

- Testes unitários na API (services, validações de upload)
- Testes de integração (fluxo criar workflow → submeter → completar)
- Testes E2E opcionais no wizard (Playwright/Cypress)
- CI: lint + build + testes em cada PR
- Healthcheck da API no `docker-compose` (Postgres e ClamAV já têm; a API ainda não)

---

## Prioridade 3 — Evolução de produto (diferencial)

Funcionalidades que diferenciam o produto em cenários complexos.

### 3.1 Workflows mais inteligentes

**Implementado (MVP):**

- **Duplicar workflow** — `POST /workflows/:id/duplicate` + botão no admin
- **Templates** — `isTemplate`, `GET /workflows/templates`, `POST /workflows/from-template/:id`
- **Etapas condicionais** — `conditionStepId` aponta para etapa anterior preenchida (upload ou resposta CHOICE); `conditionValue` opcional para filtrar resposta específica (API/seed; admin não expõe na UI)
- **Ramificações** — `branchKey` no step e na submissão, `BranchPicker` no wizard
- **Etapas CHOICE** — perguntas com opções, sem upload
- **Versionamento** — snapshot JSON ao criar submissão; `version` incrementa ao editar workflow com submissões
- **Sanitize ao reordenar** — condicionais inválidas removidas automaticamente (`clearedConditions` na resposta)

**O que ainda falta:**

- Editor visual de ramificações (diagrama)
- Biblioteca de templates na UI com preview
- Histórico de versões navegável no admin
- Etapas condicionais com operadores compostos (AND/OR)

---

### 3.2 Múltiplos participantes no mesmo processo

**Cenário:** inventário com 5 herdeiros, cada um envia documentos próprios para o mesmo espólio.

**O que falta:**

- Entidade **Caso/Processo** (ex.: `Case` ou `Process`) agrupando submissões
- Convites individuais por herdeiro
- Visão no admin: "Processo X" → N submissões vinculadas
- Status consolidado do processo (ex.: 3 de 5 herdeiros concluíram)

---

### 3.3 Conformidade (LGPD)

**O que falta:**

- Termo de consentimento e política de privacidade no início do wizard
- Base legal e finalidade do tratamento de dados documentados
- Exclusão automática de arquivos após período configurável
- Exportação de dados do titular (portabilidade)
- **Log de auditoria:** quem acessou, baixou ou excluiu cada arquivo e quando

**Impacto:** relevante para documentos pessoais e sensíveis (saúde, financeiro, herança).

---

### 3.4 Qualidade e segurança dos arquivos

**Implementado (MVP):**

- Scan antivírus com **ClamAV** no Docker Compose (`clamav` sidecar + cliente INSTREAM em `clamav.client.ts`)
- Scan no buffer antes de gravar no disco (fail-closed se ClamAV indisponível)
- Script de teste: `./scripts/generate-eicar-test-pdf.sh`

**O que ainda falta:**

- Verificação de PDF corrompido ou vazio
- (Opcional) detecção de imagem ilegível/borrada
- Bloqueio de tipos disfarçados (extensão `.pdf` com conteúdo executável)
- Pool de conexões ClamAV para alto volume

---

## Lacunas menores (já existente, mas incompleto)

Itens do código atual que podem ser refinados sem grandes features.

| Item | Situação | Sugestão |
|------|----------|----------|
| Status `DRAFT` | Existe no enum `SubmissionStatus`, não é usado | Usar para rascunho antes de `IN_PROGRESS`, ou remover do schema |
| Seed idempotente | Etapas só criadas se workflow tiver 0 steps | Documentar que alterações no seed exigem `--volumes` ou edição via admin |
| Preview no admin | Mostra `StepInstructions`, sem upload/CHOICE/ramificação | Preview completo opcional em iframe |
| Admin: `conditionValue` | API e seed suportam; editor não expõe na UI | Campo condicional para resposta específica em CHOICE |
| Admin: perfil e respostas | API retorna `branchKey` e `answers`; detalhe não exibe | Mostrar no detalhe da submissão |
| Healthcheck da API | Postgres e ClamAV têm healthcheck no Compose; API não | Adicionar `GET /health` no healthcheck do serviço `api` |
| ESLint compartilhado | Não implementado | Pacote `packages/eslint-config` para admin, web e api |
| Ícones de tipo de documento | Campo `icon` no schema, pouco usado na UI | Mapear ícones MUI no admin e no wizard |
| Internacionalização | Textos fixos em pt-BR | i18n se houver demanda multi-idioma |

---

## Matriz de priorização resumida

| # | Item | Prioridade | Esforço estimado | Dependências |
|---|------|------------|------------------|--------------|
| 1 | Auth no admin | Crítica | Médio | — |
| 2 | Proteção API + URLs de arquivo | Crítica | Médio | Auth |
| 3 | Identificação do remetente | Crítica | Baixo–médio | Migração DB |
| 4 | Storage S3/MinIO | Crítica | Médio | Infra |
| 5 | Dados no wizard / link por convite | Alta | Médio | Item 3 |
| 6 | Admin: copiar link, filtros, ZIP | Alta | Baixo–médio | Copiar link feito |
| 7 | Retomada por e-mail | Alta | Médio | E-mail, item 3 |
| 8 | Notificações | Alta | Médio | E-mail |
| 9 | Testes + CI | Alta | Médio–alto | — |
| 10 | Etapas condicionais | **Feito (MVP)** | — | — |
| 11 | Caso/processo multi-participante | Média | Alto | Item 3, 5 |
| 12 | LGPD (termo, retenção, auditoria) | Média | Médio–alto | Auth, logs |
| 13 | Antivírus (ClamAV no Docker) | **Feito (MVP)** | — | Docker |
| 14 | Validação avançada de arquivo | Baixa | Médio | Antivírus |

---

## Ordem sugerida de implementação

Sequência pragmática para maximizar valor com menor risco:

```
Fase 1 — Segurança mínima
  → Auth no admin
  → Proteger endpoints admin na API
  → URLs de download autenticadas ou assinadas

Fase 2 — Identidade e operação
  → Campos do remetente na submissão
  → Etapa de identificação no wizard
  → Copiar link, filtros e ZIP no admin

Fase 3 — Produção
  → S3/MinIO + backup
  → E-mail (notificação + retomada)
  → Testes + CI + healthcheck da API

Fase 4 — Produto avançado
  → Caso/processo com múltiplos herdeiros
  → Editor visual de ramificações / operadores AND/OR em condicionais
  → LGPD e auditoria
```

---

## Próximo passo recomendado

Para cenários como **inventário judicial com vários herdeiros**, o maior salto de valor em um único épico é:

> **Identificação do remetente + autenticação no admin**

Isso transforma o sistema de demonstração de upload em ferramenta que um escritório consegue usar com responsabilidade sobre quem enviou o quê e quem acessa os arquivos.

---

## Referências

- Limitações resumidas: [visao-geral.md](./visao-geral.md#limitações-do-mvp-atual)
- Modelo de dados atual: [banco-de-dados.md](./banco-de-dados.md)
- Uploads e validação: [api/uploads.md](./api/uploads.md)
