# Wizard de envio de documentos (Web)

**Rota:** `/w/[slug]`  
**App:** Web pública  
**Arquivo:** `apps/web/src/app/w/[slug]/page.tsx`

## Propósito

Fluxo guiado passo a passo para o usuário final enviar documentos de um workflow ativo.

## Fluxo completo

```
Carregar workflow → Criar/retomar submissão → Etapas 1..N → Revisão → Finalizar → Sucesso
```

### 1. Carregamento

- Busca workflow em `GET /public/workflows/{slug}`
- Se inativo ou inexistente: mensagem de erro
- Cria submissão em `POST /public/workflows/{slug}/submissions` (ou retoma via `localStorage`)

### 2. Persistência de sessão

Chave no `localStorage`: `docsflow_submission_{slug}`

- Salva o ID da submissão ao criar
- Ao recarregar a página, retoma a submissão existente
- Restaura a posição via `currentStepPosition` da API
- Remove a chave ao finalizar ou se a submissão for inválida

### 3. Stepper de progresso

Componente `WorkflowStepper`:

- **≤ 5 etapas:** stepper horizontal (desktop) ou vertical (mobile)
- **≥ 6 etapas:** modo compacto com barra de progresso, contador "Etapa X de Y" e faixa rolável de ícones

**Regra de conclusão:** etapa só aparece como concluída após o usuário clicar em **Próximo** (não antecipa etapas opcionais).

### 4. Cada etapa

- `StepInstructions` — título, instruções Markdown, ajuda, formatos e tamanho máximo
- `FileDropzone` — upload por arrastar, clique ou câmera (imagens)

#### Upload

- Validação client-side: extensão e tamanho
- Upload via XHR com barra de progresso
- Scan antivírus no servidor (ClamAV) — arquivos maliciosos são rejeitados com mensagem de erro na UI
- Múltiplos arquivos quando `maxFiles > 1`:
  - Contador "X de Y arquivo(s)"
  - Área de upload permanece visível até o limite
- Preview de imagens após envio
- Botão remover arquivo

#### Navegação

| Botão | Comportamento |
|-------|---------------|
| Voltar | Retorna à etapa anterior; atualiza `currentStepPosition` na API |
| Próximo | Avança se etapa obrigatória tiver arquivo OU se etapa for opcional |

### 5. Etapa de revisão

Componente `UploadReview` — resumo de todas as etapas com arquivos enviados (ou "Nenhum arquivo" em opcionais vazias).

Cada etapa exibe o botão **Alterar**, que retorna ao passo correspondente para revisar, trocar ou enviar novos arquivos. A posição é sincronizada na API via `PATCH /public/submissions/{id}/step`.

Botão **Finalizar envio** chama `POST /public/submissions/{id}/complete`.

### 6. Tela de sucesso

Componente `SuccessScreen`:

- Confirmação de envio
- ID da submissão (para referência)
- Botão **Iniciar novo envio** — limpa sessão e cria nova submissão

## Validações na finalização

A API verifica se **todas as etapas obrigatórias** possuem pelo menos um arquivo. Etapas opcionais sem upload são permitidas.

## API utilizada

Veja [api/submissoes-publicas.md](../api/submissoes-publicas.md)

## Workflows de exemplo

| Slug | Descrição |
|------|-----------|
| `abertura-conta` | 3 etapas — RG, CPF, comprovante |
| `inventario-judicial` | 19 etapas — inventário judicial completo |

Detalhes em [seed-e-exemplos.md](../seed-e-exemplos.md)
