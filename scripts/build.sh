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
  dev              Ambiente de desenvolvimento (docker-compose.dev.yml), com hot reload
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
  Web (público)  http://localhost:${WEB_PORT}/w/abertura-conta
  Admin          http://localhost:${ADMIN_PORT}
  API            http://localhost:${API_PORT}
  Swagger        http://localhost:${API_PORT}/api/docs
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

down_dev_compose() {
  local args=(down --remove-orphans)
  if [[ "$REMOVE_VOLUMES" == true ]]; then
    args+=(-v)
  fi

  echo "Derrubando dev (docker-compose.dev.yml)..."
  docker compose -f docker-compose.dev.yml "${args[@]}"
}

down_prod_compose() {
  local args=(down --remove-orphans)
  if [[ "$REMOVE_VOLUMES" == true ]]; then
    args+=(-v)
  fi

  echo "Derrubando prod (docker-compose.yml)..."
  # Projeto legado (nome da pasta) e projeto explícito no compose (docs-flow-prod)
  docker compose -p docs-flow -f docker-compose.yml "${args[@]}" 2>/dev/null || true
  docker compose -p docs-flow-prod -f docker-compose.yml "${args[@]}" 2>/dev/null || true
}

warn_ports_still_in_use() {
  local port="$1"
  local holders
  holders="$(docker ps --format '{{.Names}}' --filter "publish=${port}" 2>/dev/null || true)"
  if [[ -n "$holders" ]]; then
    echo "Aviso: porta ${port} ainda em uso por: ${holders}"
    echo "  Rode: npm run down   ou   docker stop ${holders//$'\n'/ }"
  fi
}

run_down() {
  case "$DOWN_TARGET" in
    dev)
      down_dev_compose
      ;;
    prod)
      down_prod_compose
      ;;
    all)
      down_dev_compose || true
      down_prod_compose || true
      warn_ports_still_in_use "${POSTGRES_PORT}"
      warn_ports_still_in_use "${WEB_PORT}"
      warn_ports_still_in_use "${ADMIN_PORT}"
      warn_ports_still_in_use "${API_PORT}"
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

COMPOSE_DEV=(docker compose -f docker-compose.dev.yml --profile setup)

ensure_prod_volumes() {
  docker volume create docs-flow_postgres_data >/dev/null 2>&1 || true
  docker volume create docs-flow_uploads_data >/dev/null 2>&1 || true
}

run_dev_install() {
  bash "${SCRIPT_DIR}/docker-install.sh"
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
    if [[ "$ENV_TARGET" == "dev" ]]; then
      down_dev_compose
    else
      down_prod_compose
    fi
  fi

  if [[ "$ENV_TARGET" == "dev" ]]; then
    export DEV_UID="$(id -u)"
    export DEV_GID="$(id -g)"
    echo "Parando ambiente prod (portas e volumes isolados do dev)..."
    down_prod_compose
    run_dev_install
  else
    echo "Parando ambiente dev (portas e volumes isolados do prod)..."
    down_dev_compose || true
    ensure_prod_volumes
    echo "Build do ambiente ${ENV_TARGET}..."
    # shellcheck disable=SC2086
    docker compose -f "$compose_file" build $NO_CACHE
  fi

  echo "Subindo banco e antivírus..."
  docker compose -f "$compose_file" up -d postgres clamav

  if [[ "$ENV_TARGET" == "dev" ]]; then
    echo "Aplicando migrations..."
    "${COMPOSE_DEV[@]}" run --rm migrate

    echo "Executando seed..."
    "${COMPOSE_DEV[@]}" run --rm seed

    echo "Subindo aplicação..."
    docker compose -f "$compose_file" up -d
  else
    echo "Aplicando migrations..."
    docker compose -f "$compose_file" run --rm migrate

    echo "Executando seed..."
    docker compose -f "$compose_file" run --rm seed

    echo "Subindo aplicação..."
    docker compose -f "$compose_file" up -d
  fi

  local postgres_port
  postgres_port="$(get_env_value "$PROJECT_DIR" POSTGRES_PORT "$POSTGRES_PORT")"

  echo ""
  echo "Ambiente '$ENV_TARGET' em execução (banco e uploads em volume isolado deste ambiente)."
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
