# API — Health check

**Endpoint:** `GET /health`  
**Arquivo:** `apps/api/src/health/health.controller.ts`

## Resposta

```json
{
  "status": "ok",
  "timestamp": "2026-08-29T18:27:45.324Z"
}
```

## Uso

Verificação de disponibilidade da API em monitoramento, Docker healthchecks ou smoke tests.

```bash
curl http://localhost:4000/health
```
