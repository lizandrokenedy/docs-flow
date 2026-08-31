#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# shellcheck source=docker-clean-artifacts.sh
source "${SCRIPT_DIR}/docker-clean-artifacts.sh"

needs_install=false
if [[ ! -d node_modules/@docs-flow/types ]]; then
  needs_install=true
elif [[ ! -f node_modules/.package-lock.json ]] || ! cmp -s package-lock.json node_modules/.package-lock.json; then
  needs_install=true
fi

if [[ "$needs_install" == true ]]; then
  echo "Dependências desatualizadas; instalando via Docker..."
  "${COMPOSE_DEV[@]}" run --rm install
fi
