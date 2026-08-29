#!/usr/bin/env bash

# Portas canônicas do ambiente local
WEB_PORT=3000
ADMIN_PORT=3001
API_PORT=4000
POSTGRES_PORT=5433

get_env_value() {
  local project_dir="${1:-.}"
  local key="$2"
  local default="${3:-}"

  if [[ -f "${project_dir}/.env" ]]; then
    local val
    val=$(grep -E "^${key}=" "${project_dir}/.env" | tail -1 | cut -d= -f2- | tr -d '\r"'"'" || true)
    if [[ -n "$val" ]]; then
      echo "$val"
      return
    fi
  fi

  echo "$default"
}
