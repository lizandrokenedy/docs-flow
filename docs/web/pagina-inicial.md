# Página inicial (Web)

**Rota:** `/`  
**App:** Web pública (`http://localhost:3000`)  
**Arquivo:** `apps/web/src/app/page.tsx`

## Propósito

Landing page simples que apresenta o Docs Flow e orienta o usuário a acessar um workflow pelo link recebido.

## Conteúdo

- Título e descrição do sistema
- Instrução para usar o link do workflow (não há listagem pública de fluxos)
- Link de demonstração para `/w/abertura-conta`

## Observações

- Não há autenticação
- Não há busca de workflows — o acesso é sempre via URL direta `/w/{slug}` fornecida pelo administrador
