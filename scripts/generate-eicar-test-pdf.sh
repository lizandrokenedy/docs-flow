#!/usr/bin/env bash
# Gera um PDF de teste com a string EICAR (padrão da indústria para testar antivírus).
# O arquivo NÃO contém malware real — apenas uma assinatura que scanners reconhecem.
# Uso: ./scripts/generate-eicar-test-pdf.sh [caminho-de-saida]
#
# Depois de gerar, envie pelo wizard público e confirme a mensagem:
# "Arquivo rejeitado: possível malware detectado."

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT="${1:-${ROOT_DIR}/eicar-test.pdf}"

EICAR='X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'

python3 - "$OUTPUT" "$EICAR" <<'PY'
import sys

output_path = sys.argv[1]
eicar = sys.argv[2].encode("ascii")
content = eicar + b"\n"
length = len(content)

pdf = (
    b"%PDF-1.4\n"
    b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Contents 4 0 R>>endobj\n"
    + f"4 0 obj<</Length {length}>>stream\n".encode("ascii")
    + content
    + b"endstream\nendobj\n"
    b"xref\n0 5\n"
    b"0000000000 65535 f \n"
    b"0000000009 00000 n \n"
    b"0000000058 00000 n \n"
    b"0000000115 00000 n \n"
    b"0000000206 00000 n \n"
    b"trailer<</Size 5/Root 1 0 R>>\n"
    b"startxref\n300\n%%EOF\n"
)

with open(output_path, "wb") as f:
    f.write(pdf)

print(f"Arquivo gerado: {output_path}")
print("Envie este PDF no wizard para testar o bloqueio do ClamAV.")
PY
