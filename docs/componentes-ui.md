# Componentes de UI compartilhados

**Pacote:** `@docs-flow/ui`  
**Diretório:** `packages/ui/src/`

Componentes usados no wizard público e no preview do admin.

## Tema

### `docsFlowTheme`

Arquivo: `theme.ts`

Tema MUI customizado:

- Cor primária: `#1565C0`
- Fonte: Inter
- Bordas arredondadas

## Componentes

### `WorkflowStepper`

**Arquivo:** `WorkflowStepper.tsx`

Barra de progresso do wizard.

| Prop | Tipo | Descrição |
|------|------|-----------|
| steps | array | Etapas do workflow |
| activeStep | number | Índice da etapa atual (0-based) |

**Modos:**

- **Clássico** (< 6 etapas): stepper MUI com labels
- **Compacto** (≥ 6 etapas): barra de progresso, "Etapa X de Y", título atual, faixa rolável de ícones com tooltip

Etapa concluída = índice menor que `activeStep`.

### `StepInstructions`

**Arquivo:** `StepInstructions.tsx`

Card com instruções da etapa:

- Título e tipo de documento
- Instruções em **Markdown** (`react-markdown`)
- Alerta de ajuda (ícone `?`)
- Link "Ver exemplo" (nova aba)
- Formatos aceitos e tamanho máximo em MB

### `FileDropzone`

**Arquivo:** `FileDropzone.tsx`

Área de upload com drag-and-drop.

| Prop | Descrição |
|------|-----------|
| acceptedExtensions | Lista de extensões |
| maxSizeBytes | Limite por arquivo |
| maxFiles | Quantidade máxima |
| files | Arquivos já enviados |
| uploading / uploadProgress | Estado do envio |
| onUpload / onRemove | Callbacks |
| enableCamera | Captura por câmera (mobile) |

**Comportamento multi-arquivo:**

- Contador "X de Y arquivo(s)"
- Lista de arquivos enviados com preview de imagem
- Área de upload permanece até atingir `maxFiles`
- Validação client-side antes de chamar `onUpload`

### `UploadReview`

**Arquivo:** `UploadReview.tsx`

Tela de revisão pré-finalização:

- Lista etapas visíveis do fluxo
- DOCUMENT: arquivos com nome e tamanho; "Nenhum arquivo" em opcionais vazias
- CHOICE: exibe `Resposta: {valor}` em vez de arquivo
- Botão **Alterar** por etapa (`onEditStep`)

### `ChoiceStep`

**Arquivo:** `ChoiceStep.tsx`

Etapa de pergunta com opções em radio buttons.

| Prop | Descrição |
|------|-----------|
| title, instructions, helpText | Conteúdo da etapa |
| options | Lista de strings (`choiceOptions`) |
| value / onChange | Resposta selecionada |

Sem upload de arquivo.

### `BranchPicker`

**Arquivo:** `BranchPicker.tsx`

Seleção de perfil antes das etapas de documento.

| Prop | Descrição |
|------|-----------|
| options | `{ key, label }[]` |
| onSelect | Callback com `branchKey` |

### `formatBranchLabel`

Converte chaves conhecidas (`herdeiro`, `inventariante`, `advogado`) em labels amigáveis; demais chaves retornam o valor original.

### `SuccessScreen`

**Arquivo:** `SuccessScreen.tsx`

Tela de confirmação após envio:

- Mensagem de sucesso animada
- ID da submissão
- Botão para iniciar novo envio

### `AnimatedStepPanel`

**Arquivo:** `AnimatedStepPanel.tsx`

Wrapper com animação Framer Motion entre etapas (fade/slide ao trocar `stepKey`).

## Utilitários de animação

**Arquivo:** `motion.ts`

Presets: `fadeInUp`, `slideInRight`, `scaleIn`, `staggerContainer`, configurações de `transition`.

## Desenvolvimento com Docker

No ambiente dev, o código em `packages/ui/src` é montado via volume. Após alterações, reinicie os frontends se necessário:

```bash
docker compose -f docker-compose.dev.yml restart web admin
```

Os apps consomem o pacote compilado em `packages/ui/dist/` dentro do container.
