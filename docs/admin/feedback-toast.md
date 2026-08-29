# Admin — Feedback visual (Toast)

**Arquivos:** `apps/admin/src/components/ToastProvider.tsx`, `apps/admin/src/components/Providers.tsx`

## Propósito

Exibir mensagens temporárias (Snackbar) após ações do usuário ou falhas de carregamento, sem interromper o fluxo de trabalho.

## Uso

```tsx
import { useToast } from '@/components/ToastProvider';

const { showToast } = useToast();

showToast('Salvo com sucesso');                    // success (padrão)
showToast('Algo deu errado', 'error');
showToast('Atenção', 'warning');
showToast('Informação', 'info');
```

## Onde está aplicado

| Tela | Sucesso | Erro |
|------|---------|------|
| Tipos de documento | Criar, editar, remover | API / validação |
| Workflows (lista) | Criar, remover, duplicar, usar template | API |
| Editor de workflow | Salvar, steps, reordenar | API; toast de aviso se condicionais removidas na reordenação |
| Dashboard | Copiar link | Erros de query (global) |
| Submissões | Copiar ID / link | Erros de query (global) |

## Copiar para área de transferência

Hook `useClipboard` e componente `CopyLinkButton`:

```tsx
import { CopyLinkButton } from '@/components/CopyLinkButton';
import { useClipboard } from '@/hooks/useClipboard';

<CopyLinkButton url={getPublicWorkflowUrl(slug)} />
```

## Erros globais de carregamento

`Providers` configura `QueryCache.onError` para exibir toast quando uma query falha (ex.: API indisponível). Mutations continuam com feedback explícito em cada tela.

## Comportamento

- Posição: inferior central
- Duração: 4s (sucesso/info) ou 6s (erro)
- Não fecha ao clicar fora (`clickaway` ignorado)
- Nova mensagem reinicia o timer (`key={message}`)
