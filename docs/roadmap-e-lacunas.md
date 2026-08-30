# Roadmap e lacunas do projeto

Documento de **pendências** e priorização para evoluir o Docs Flow até produção. O que já está implementado está descrito em [visao-geral.md](./visao-geral.md).

---

## Prioridade 1 — Crítico (antes de produção)

### 1.1 Autenticação no admin

Qualquer pessoa com acesso à URL do admin pode ver workflows, submissões e arquivos.

**Pendências:**

- Login de administradores (e-mail/senha, OAuth ou SSO)
- Proteção de rotas no Next.js (middleware)
- Tokens (JWT ou sessão) nas chamadas à API
- Papéis básicos (ex.: `admin`, `viewer`) — opcional na primeira versão

---

### 1.2 Proteção da API e dos arquivos

Endpoints administrativos e públicos sem autenticação; arquivos em URL previsível (`/uploads/{submissionId}/{stepId}/{storedName}`); sem rate limiting no upload.

**Pendências:**

- Autenticação/autorização nos endpoints administrativos
- URLs de download **assinadas e temporárias** (ou proxy autenticado)
- Rate limiting em upload e criação de submissões

---

### 1.3 Metadados do remetente

O modelo `Submission` não identifica quem enviou (nome, e-mail ou campos customizados).

**Pendências:**

- Campos configuráveis de identificação na submissão
- Etapa inicial no wizard ou formulário antes do fluxo
- Suporte a múltiplas submissões do mesmo link com remetentes distintos

**Sugestão de modelo:**

```
Submission
  submitterName
  submitterEmail
  submitterDocument   // opcional
  submitterPhone      // opcional
  metadata            // JSON para campos extras por workflow
```

---

### 1.4 Armazenamento escalável de arquivos

Arquivos no volume Docker (`UPLOAD_DIR`), adequado só para desenvolvimento.

**Pendências:**

- Integração com S3, MinIO ou equivalente
- Backup automatizado de uploads
- Política de retenção e exclusão
- Estratégia de migração do disco local para object storage

---

## Prioridade 2 — Importante (experiência e operação)

### 2.1 Identificação no wizard público

**Pendências:**

- Tela de boas-vindas com coleta de dados do remetente antes das etapas
- Link com token ou convite individual (`/w/{slug}?token=...` ou rota dedicada)
- Validação de campos obrigatórios antes de iniciar o fluxo

Relacionado ao item 1.3.

---

### 2.2 Admin mais operacional

**Pendências:**

| Feature | Descrição |
|---------|-----------|
| Filtros | Por workflow, status, período |
| Busca | Por ID da submissão ou dados do remetente |
| Download em ZIP | Baixar todos os arquivos de uma submissão de uma vez |
| Status operacionais | Além de `IN_PROGRESS` / `COMPLETED`: status customizáveis |
| Exportação | CSV/Excel de submissões para relatório |

---

### 2.3 Retomada entre dispositivos

A retomada atual funciona só no mesmo navegador (`localStorage`).

**Pendências:**

- Link mágico enviado por e-mail para retomar submissão
- Ou identificação + busca de submissão em andamento na API

---

### 2.4 Notificações

**Pendências:**

- E-mail ao admin quando uma submissão é finalizada
- E-mail de confirmação ao usuário com ID/protocolo do envio
- (Opcional) lembrete de submissão incompleta após X dias

**Dependências:** serviço de e-mail (SMTP, SendGrid, SES, etc.).

---

### 2.5 CI e qualidade contínua

**Pendências:**

- CI: lint + build + testes em cada PR (GitHub Actions)
- Testes E2E opcionais no wizard (Playwright/Cypress)
- Healthcheck da API no `docker-compose` de produção/dev
- ESLint compartilhado (`packages/eslint-config`)

---

## Prioridade 3 — Evolução de produto

### 3.1 Editor visual de fluxo

**Pendências:**

- Editor visual de fluxo (diagrama interativo)
- Etapas condicionais com operadores compostos (AND/OR)

---

### 3.2 Agrupamento multi-participante

Um mesmo processo reúne várias submissões independentes (ex.: campanha de coleta, onboarding de equipe, checklist por participante).

**Pendências:**

- Entidade **Caso/Processo** agrupando submissões
- Convites individuais por participante
- Visão no admin: processo → N submissões vinculadas
- Status consolidado (ex.: 3 de 5 participantes concluíram)

---

### 3.3 Conformidade (LGPD)

**Pendências:**

- Termo de consentimento e política de privacidade no início do wizard
- Base legal e finalidade do tratamento de dados documentados
- Exclusão automática de arquivos após período configurável
- Exportação de dados do titular (portabilidade)
- Log de auditoria: quem acessou, baixou ou excluiu cada arquivo e quando

---

### 3.4 Validação avançada de arquivos

**Pendências:**

- Verificação de PDF corrompido ou vazio
- (Opcional) detecção de imagem ilegível/borrada
- Bloqueio de tipos disfarçados (extensão `.pdf` com conteúdo executável)
- Pool de conexões ClamAV para alto volume

---

## Lacunas menores

Refinamentos no código existente, sem features grandes.

| Item | Sugestão |
|------|----------|
| Status `DRAFT` no enum, não usado | Usar para rascunho ou remover do schema |
| Seed idempotente | Documentar que alterações no seed exigem `--volumes` ou edição via admin |
| Respostas só no detalhe da submissão | Coluna ou filtro na listagem |
| Ícones de tipo de documento | Campo `icon` no schema pouco usado na UI |
| Internacionalização | i18n se houver demanda multi-idioma |

---

## Matriz de priorização

| # | Item | Prioridade | Esforço | Dependências |
|---|------|------------|---------|--------------|
| 1 | Auth no admin | Crítica | Médio | — |
| 2 | Proteção API + URLs de arquivo | Crítica | Médio | Auth |
| 3 | Metadados do remetente | Crítica | Baixo–médio | Migração DB |
| 4 | Storage S3/MinIO | Crítica | Médio | Infra |
| 5 | Identificação no wizard / convite | Alta | Médio | Item 3 |
| 6 | Admin: filtros, busca, ZIP, exportação | Alta | Baixo–médio | Item 3 (busca) |
| 7 | Retomada por e-mail | Alta | Médio | E-mail, item 3 |
| 8 | Notificações | Alta | Médio | E-mail |
| 9 | CI + healthcheck da API | Alta | Baixo–médio | — |
| 10 | Caso/processo multi-participante | Média | Alto | Item 3, 5 |
| 11 | LGPD | Média | Médio–alto | Auth, logs |
| 12 | Validação avançada de arquivo | Baixa | Médio | — |

---

## Ordem sugerida

```
Fase 1 — Segurança mínima
  → Auth no admin
  → Proteger endpoints admin na API
  → URLs de download autenticadas ou assinadas

Fase 2 — Identidade e operação
  → Metadados do remetente
  → Identificação no wizard
  → Filtros, busca e ZIP no admin

Fase 3 — Produção
  → S3/MinIO + backup
  → E-mail (notificação + retomada)
  → CI + healthcheck da API

Fase 4 — Produto avançado
  → Caso/processo multi-participante
  → Editor visual de fluxo / operadores AND/OR
  → LGPD e auditoria
```

---

## Próximo passo recomendado

> **Metadados do remetente + autenticação no admin**

É o épico que mais aumenta a operabilidade: identifica quem enviou cada submissão e controla quem acessa os arquivos.

---

## Referências

- Funcionalidades atuais: [visao-geral.md](./visao-geral.md)
- Modelo de dados: [banco-de-dados.md](./banco-de-dados.md)
- Uploads e validação: [api/uploads.md](./api/uploads.md)
