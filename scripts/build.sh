#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

cd "$PROJECT_DIR"

ACTION="up"
ENV_TARGET=""
DOWN_TARGET="all"
NO_CACHE=""
DOWN_FIRST=false
REMOVE_VOLUMES=false

show_help() {
  cat <<EOF
Uso: $0 {dev|prod|down} [opções]

Comandos:
  dev              Ambiente de desenvolvimento (docker-compose.dev.yml) — hot reload
  prod             Ambiente local de produção (docker-compose.yml)
  down [dev|prod|all]   Derruba containers (padrão: all)

Opções (dev/prod):
  --down           Derruba o ambiente antes de buildar e subir
  --no-cache       Rebuild completo sem cache do Docker

Opções (down):
  --volumes        Remove volumes do compose (-v)

Exemplos:
  $0 dev
  $0 dev --down --no-cache
  $0 prod
  $0 down
  $0 down dev --volumes

URLs (dev / prod):
  Web (público)  → http://localhost:${WEB_PORT}/w/abertura-conta
  Admin          → http://localhost:${ADMIN_PORT}
  API            → http://localhost:${API_PORT}
  Swagger        → http://localhost:${API_PORT}/api/docs
EOF
}

require_env_file() {
  if [[ -f .env ]]; then
    return 0
  fi

  if [[ -f .env.example ]]; then
    echo "Criando .env a partir de .env.example..."
    cp .env.example .env
    return 0
  fi

  echo "Falta .env na raiz. Copie de .env.example"
  exit 1
}

down_compose() {
  local compose_file="$1"
  local label="$2"

  if [[ ! -f "$compose_file" ]]; then
    echo "Arquivo não encontrado: $compose_file"
    return 1
  fi

  echo "Derrubando $label ($compose_file)..."

  local args=(down --remove-orphans)
  if [[ "$REMOVE_VOLUMES" == true ]]; then
    args+=(-v)
  fi

  docker compose -f "$compose_file" "${args[@]}"
}

run_down() {
  case "$DOWN_TARGET" in
    dev)
      down_compose "docker-compose.dev.yml" "dev"
      ;;
    prod)
      down_compose "docker-compose.yml" "prod"
      ;;
    all)
      down_compose "docker-compose.dev.yml" "dev" || true
      down_compose "docker-compose.yml" "prod" || true
      ;;
    *)
      echo "Alvo inválido para down: $DOWN_TARGET"
      echo "Use: dev, prod ou all"
      exit 1
      ;;
  esac

  echo ""
  echo "Containers derrubados."
}

run_up() {
  require_env_file

  local compose_file
  case "$ENV_TARGET" in
    dev)
      compose_file="docker-compose.dev.yml"
      ;;
    prod)
      compose_file="docker-compose.yml"
      ;;
    *)
      echo "Ambiente inválido: $ENV_TARGET"
      exit 1
      ;;
  esac

  if [[ "$DOWN_FIRST" == true ]]; then
    echo "Parando containers existentes..."
    docker compose -f "$compose_file" down --remove-orphans
  fi

  echo "Build do ambiente ${ENV_TARGET}..."
  # shellcheck disable=SC2086
  docker compose -f "$compose_file" build $NO_CACHE

  echo "Subindo ambiente ${ENV_TARGET}..."
  docker compose -f "$compose_file" up -d

  local postgres_port
  postgres_port="$(get_env_value "$PROJECT_DIR" POSTGRES_PORT "$POSTGRES_PORT")"

  echo ""
  echo "Ambiente '$ENV_TARGET' em execução."
  echo "  Web (público):  http://localhost:${WEB_PORT}/w/abertura-conta"
  echo "  Admin:          http://localhost:${ADMIN_PORT}"
  echo "  API:            http://localhost:${API_PORT}"
  echo "  Swagger:        http://localhost:${API_PORT}/api/docs"
  echo "  Postgres:       localhost:${postgres_port}"
  echo ""
  echo "Ver logs:  docker compose -f $compose_file logs -f"
  echo "Derrubar:  $0 down ${ENV_TARGET}"
}

if [[ $# -eq 0 ]]; then
  show_help
  exit 1
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    dev | prod)
      if [[ -n "$ENV_TARGET" && "$ACTION" == "up" ]]; then
        echo "Ambiente duplicado: $1"
        exit 1
      fi
      ENV_TARGET="$1"
      ACTION="up"
      shift
      ;;
    down)
      ACTION="down"
      shift
      if [[ $# -gt 0 && "$1" =~ ^(dev|prod|all)$ ]]; then
        DOWN_TARGET="$1"
        shift
      fi
      ;;
    --no-cache)
      NO_CACHE="--no-cache"
      shift
      ;;
    --down)
      DOWN_FIRST=true
      shift
      ;;
    --volumes)
      REMOVE_VOLUMES=true
      shift
      ;;
    -h | --help)
      show_help
      exit 0
      ;;
    *)
      echo "Opção desconhecida: $1"
      show_help
      exit 1
      ;;
  esac
done

case "$ACTION" in
  up)
    if [[ -z "$ENV_TARGET" ]]; then
      echo "Informe o ambiente: dev ou prod"
      show_help
      exit 1
    fi
    if [[ "$REMOVE_VOLUMES" == true ]]; then
      echo "A opção --volumes só pode ser usada com: $0 down"
      exit 1
    fi
    run_up
    ;;
  down)
    if [[ -n "$ENV_TARGET" ]]; then
      DOWN_TARGET="$ENV_TARGET"
    fi
    if [[ "$DOWN_FIRST" == true || -n "$NO_CACHE" ]]; then
      echo "As opções --down e --no-cache só podem ser usadas com: $0 dev|prod"
      exit 1
    fi
    run_down
    ;;
esac
