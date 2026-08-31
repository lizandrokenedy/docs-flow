#!/usr/bin/env bash
# Limpa artefatos Docker com permissão errada no host (root).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

export DEV_UID="$(id -u)"
export DEV_GID="$(id -g)"

COMPOSE_DEV=(docker compose -f docker-compose.dev.yml --profile setup)

if [[ -d node_modules ]] && { [[ ! -d node_modules/@docs-flow/types ]] || [[ ! -w node_modules ]]; }; then
  echo "Limpando node_modules inacessível (volume antigo do Docker)..."
  "${COMPOSE_DEV[@]}" run --rm --user root install \
    sh -c 'rm -rf node_modules apps/*/node_modules packages/*/node_modules packages/types/dist packages/ui/dist'
fi

if [[ -d apps/api/dist ]] && [[ ! -w apps/api/dist ]]; then
  echo "Limpando apps/api/dist inacessível..."
  "${COMPOSE_DEV[@]}" run --rm --user root install \
    sh -c 'rm -rf apps/api/dist'
fi

for app in web admin; do
  if [[ -d "apps/${app}/.next" ]] && [[ ! -w "apps/${app}/.next" ]]; then
    echo "Limpando apps/${app}/.next inacessível (build prod como root)..."
    "${COMPOSE_DEV[@]}" run --rm --user root install \
      sh -c "rm -rf apps/${app}/.next"
  fi
done

if [[ -d coverage ]] && [[ ! -w coverage ]]; then
  echo "Limpando coverage/ inacessível..."
  "${COMPOSE_DEV[@]}" run --rm --user root install \
    sh -c 'rm -rf coverage'
fi
