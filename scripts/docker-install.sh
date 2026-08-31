#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# shellcheck source=docker-clean-artifacts.sh
source "${SCRIPT_DIR}/docker-clean-artifacts.sh"

echo "Instalando dependências via Docker (reflete em node_modules/ no host)..."
"${COMPOSE_DEV[@]}" run --rm install
