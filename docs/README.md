# Docs Flow — Documentação

Sistema de coleta guiada de documentos. Permite criar **workflows** (fluxos) com etapas configuráveis — documentos, perguntas com vários tipos e condicionais — e disponibilizar um link público para que usuários enviem arquivos passo a passo.

**Recursos avançados:** templates (biblioteca com preview), duplicação, histórico de versões com diff, snapshot por submissão, ClamAV. Detalhes em [visao-geral.md](./visao-geral.md) e [seed-e-exemplos.md](./seed-e-exemplos.md).

## Índice

### Introdução

- [Visão geral](./visao-geral.md)
- [Arquitetura](./arquitetura.md)
- [Instalação e execução](./instalacao.md)
- [Variáveis de ambiente](./variaveis-de-ambiente.md)
- [Banco de dados](./banco-de-dados.md)
- [Componentes de UI compartilhados](./componentes-ui.md)
- [Dados de exemplo (seed)](./seed-e-exemplos.md)
- [Roadmap e lacunas do projeto](./roadmap-e-lacunas.md)

### Painel Admin (`http://localhost:3001`)

| Tela | Documentação |
|------|----------------|
| Dashboard | [admin/dashboard.md](./admin/dashboard.md) |
| Tipos de documento | [admin/tipos-de-documento.md](./admin/tipos-de-documento.md) |
| Lista de workflows | [admin/workflows.md](./admin/workflows.md) |
| Biblioteca de templates | [admin/biblioteca-templates.md](./admin/biblioteca-templates.md) |
| Editor de workflow | [admin/editor-workflow.md](./admin/editor-workflow.md) |
| Lista de submissões | [admin/submissoes.md](./admin/submissoes.md) |
| Detalhe da submissão | [admin/detalhe-submissao.md](./admin/detalhe-submissao.md) |
| Feedback visual (toast) | [admin/feedback-toast.md](./admin/feedback-toast.md) |

### Aplicação pública (`http://localhost:3000`)

| Tela | Documentação |
|------|----------------|
| Página inicial | [web/pagina-inicial.md](./web/pagina-inicial.md) |
| Wizard de envio (`/w/[slug]`) | [web/wizard-documentos.md](./web/wizard-documentos.md) |

### API REST (`http://localhost:4000`)

| Recurso | Documentação |
|---------|----------------|
| Visão geral da API | [api/README.md](./api/README.md) |
| Health check | [api/health.md](./api/health.md) |
| Tipos de documento | [api/tipos-de-documento.md](./api/tipos-de-documento.md) |
| Workflows | [api/workflows.md](./api/workflows.md) |
| Submissões (admin) | [api/submissoes-admin.md](./api/submissoes-admin.md) |
| Submissões (público) | [api/submissoes-publicas.md](./api/submissoes-publicas.md) |
| Upload de arquivos | [api/uploads.md](./api/uploads.md) |

### Referência rápida

| Serviço | URL padrão |
|---------|------------|
| Web pública | http://localhost:3000 |
| Admin | http://localhost:3001 |
| API | http://localhost:4000 |
| Swagger | http://localhost:4000/api/docs |
| PostgreSQL | localhost:5433 |
| ClamAV (debug) | localhost:3310 |

## Scripts

| Script | Descrição |
|--------|-----------|
| `npm run dev` / `npm run prod` / `npm run down` / `npm run install` | Atalhos Docker — [instalacao.md](./instalacao.md) |
| `./scripts/build.sh` | Ambiente Docker (dev / prod / down) |
| `npm run db:reset` | Recria banco **dev** (volumes + migrate + seed) |
| `npm run test` | Testes com cobertura (stack Docker isolada) — [detalhes](./instalacao.md#testes-automatizados) |
| `npm run test:up` / `npm run test:down` | Sobe ou derruba a stack de teste |
| `./scripts/generate-eicar-test-pdf.sh` | PDF de teste EICAR para validar antivírus |
