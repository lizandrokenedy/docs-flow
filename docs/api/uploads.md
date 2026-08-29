# API — Uploads

**Arquivo:** `apps/api/src/uploads/uploads.service.ts`

Serviço interno responsável por validar, salvar e servir arquivos enviados.

## Armazenamento

### Estrutura no disco

```
{UPLOAD_DIR}/
  {submissionId}/
    {stepId}/
      {uuid}.{ext}
```

O nome original do arquivo é preservado apenas no banco (`originalName`). No disco usa-se UUID para evitar colisões.

### Servir arquivos

Configurado em `main.ts` como arquivos estáticos:

```
GET /uploads/{submissionId}/{stepId}/{storedName}
```

## Validações (`validateFile`)

| Regra | Erro |
|-------|------|
| Extensão não permitida | `Formato não aceito` |
| MIME não permitido | Validado indiretamente via extensão |
| Tamanho > maxSizeBytes | `Arquivo muito grande. Máximo: X MB` |
| Arquivos ≥ maxFiles | `Limite de N arquivo(s) atingido` |

Extensões aceitas são resolvidas por `getStepAcceptedExtensions()`:

1. `acceptedExtensionsOverride` da etapa (se preenchido)
2. Senão, `allowedExtensions` do tipo de documento

**Etapas CHOICE:** o endpoint de upload retorna `400` se `stepKind === 'CHOICE'` — respostas usam `PATCH .../answer`.

## Antivírus (ClamAV)

**Arquivos:**

- `apps/api/src/uploads/virus-scan.service.ts` — orquestra o scan e mapeia erros
- `apps/api/src/uploads/clamav.client.ts` — cliente TCP com protocolo INSTREAM

Fluxo no upload (`submissions.service.ts`):

1. Validação de extensão, MIME, tamanho e quantidade
2. **Scan do buffer em memória** (antes de gravar no disco)
3. Persistência em `UPLOAD_DIR` somente se o scan passar

| Resultado | HTTP | Mensagem | Comportamento |
|-----------|------|----------|---------------|
| Limpo | — | — | Upload prossegue |
| Malware | `400` | `Arquivo rejeitado: possível malware detectado.` | Nada é salvo |
| Erro de scan | `400` | `Não foi possível verificar o arquivo com segurança.` | Nada é salvo |
| Arquivo vazio | `400` | `Arquivo vazio não pode ser enviado.` | Nada é salvo |
| ClamAV indisponível | `503` | `Verificação de segurança indisponível. Tente novamente em instantes.` | Fail-closed |

O scan só roda quando `CLAMAV_ENABLED` não é `false` **e** `CLAMAV_HOST` está definido (padrão no Docker Compose).

### Cliente ClamAV

A API usa um cliente próprio (`clamav.client.ts`) em vez de bibliotecas de terceiros. Motivo: compatibilidade com respostas do `clamd` que incluem bytes nulos (`stream: OK\u0000`), que quebravam parsers anteriores.

O cliente envia o buffer via protocolo **INSTREAM** (comando `zINSTREAM`, chunks de até 2 MB) e interpreta:

- `stream: OK` → arquivo limpo
- `stream: {nome}` → malware detectado
- timeout / conexão recusada → indisponível (com até 2 retentativas)

### Serviço Docker

```yaml
clamav:
  image: clamav/clamav:stable
```

A API aguarda o healthcheck do ClamAV (`clamdcheck.sh`) antes de subir. Na primeira inicialização, o ClamAV pode levar **1–2 minutos** para carregar as definições de vírus.

### Testar o bloqueio (EICAR)

Use o script que gera um PDF com a string de teste padrão da indústria (não é malware real — apenas uma assinatura reconhecida por scanners):

```bash
./scripts/generate-eicar-test-pdf.sh
# → cria eicar-test.pdf na raiz (já está no .gitignore)
```

**Verificar no ClamAV:**

```bash
docker cp eicar-test.pdf docs-flow-clamav-1:/tmp/eicar-test.pdf
docker exec docs-flow-clamav-1 clamdscan /tmp/eicar-test.pdf
# Esperado: Infected files: 1
```

**Verificar na API:**

```bash
SUB=$(curl -s -X POST http://localhost:4000/public/workflows/abertura-conta/submissions)
SUB_ID=$(echo "$SUB" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
STEP_ID=$(echo "$SUB" | python3 -c "import sys,json; print(json.load(sys.stdin)['workflow']['steps'][0]['id'])")
curl -s -X POST "http://localhost:4000/public/submissions/${SUB_ID}/steps/${STEP_ID}/upload" \
  -F "file=@eicar-test.pdf;type=application/pdf"
# Esperado: HTTP 400 — "Arquivo rejeitado: possível malware detectado."
```

Envie o mesmo arquivo pelo wizard em `http://localhost:3000/w/abertura-conta` para validar a mensagem na UI.

> O PDF de teste **não deve ser commitado** — repositórios Git e o GitHub bloqueiam a string EICAR.

## Limite do Multer

Upload HTTP limitado a **50 MB** no middleware (independente do limite por tipo de documento).

## Remoção

`removeUpload` apaga o registro no banco e o arquivo físico.

## URLs no frontend

**Admin** (`apps/admin/src/lib/config.ts`):

```ts
getUploadUrl(submissionId, stepId, storedName)
// → {API_URL}/uploads/{submissionId}/{stepId}/{storedName}
```

**Web** — previews de imagem usam a mesma URL base.
