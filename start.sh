#!/bin/sh
set -eu

# Local demo credential bridge (managed by tools/fix_demo_autofill.mjs)
demo_credentials_project_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if [ -f "$demo_credentials_project_dir/.env" ]; then
  while IFS= read -r demo_credentials_line || [ -n "$demo_credentials_line" ]; do
    case "$demo_credentials_line" in ''|'#'*) continue ;; esac
    demo_credentials_line="${demo_credentials_line#export }"
    demo_credentials_key="${demo_credentials_line%%=*}"
    demo_credentials_value="${demo_credentials_line#*=}"
    case "$demo_credentials_key" in
      NODE_ENV|ENABLE_DEMO_CREDENTIAL_AUTOFILL|DEMO_EMAIL|DEMO_PASSWORD|SEED_ADMIN_EMAIL|SEED_ADMIN_PASSWORD|ADMIN_EMAIL|ADMIN_PASSWORD|DEFAULT_EMAIL|DEFAULT_PASSWORD) ;;
      *) continue ;;
    esac
    [ -n "${!demo_credentials_key+x}" ] && continue
    demo_credentials_first="${demo_credentials_value:0:1}"
    demo_credentials_last="${demo_credentials_value: -1}"
    if { [ "$demo_credentials_first" = '"' ] && [ "$demo_credentials_last" = '"' ]; } || { [ "$demo_credentials_first" = "'" ] && [ "$demo_credentials_last" = "'" ]; }; then
      demo_credentials_value="${demo_credentials_value:1:${#demo_credentials_value}-2}"
    fi
    export "$demo_credentials_key=$demo_credentials_value"
  done < "$demo_credentials_project_dir/.env"
fi
demo_credentials_email=""
demo_credentials_password=""
if [ -n "${DEMO_EMAIL:-}" ] && [ -n "${DEMO_PASSWORD:-}" ]; then
  demo_credentials_email="$DEMO_EMAIL"
  demo_credentials_password="$DEMO_PASSWORD"
elif [ -n "${SEED_ADMIN_EMAIL:-}" ] && [ -n "${SEED_ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$SEED_ADMIN_EMAIL"
  demo_credentials_password="$SEED_ADMIN_PASSWORD"
elif [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$ADMIN_EMAIL"
  demo_credentials_password="$ADMIN_PASSWORD"
elif [ -n "${DEFAULT_EMAIL:-}" ] && [ -n "${DEFAULT_PASSWORD:-}" ]; then
  demo_credentials_email="$DEFAULT_EMAIL"
  demo_credentials_password="$DEFAULT_PASSWORD"
fi
if [ "${NODE_ENV:-development}" != production ] && [ "${ENABLE_DEMO_CREDENTIAL_AUTOFILL:-true}" = true ] && [ -n "$demo_credentials_email" ] && [ -n "$demo_credentials_password" ]; then
  export VITE_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export VITE_DEMO_EMAIL="$demo_credentials_email"
  export VITE_DEMO_PASSWORD="$demo_credentials_password"
  export REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export REACT_APP_DEMO_EMAIL="$demo_credentials_email"
  export REACT_APP_DEMO_PASSWORD="$demo_credentials_password"
  export NEXT_PUBLIC_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export NEXT_PUBLIC_DEMO_EMAIL="$demo_credentials_email"
  export NEXT_PUBLIC_DEMO_PASSWORD="$demo_credentials_password"
else
  export VITE_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  export REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  export NEXT_PUBLIC_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  unset VITE_DEMO_EMAIL VITE_DEMO_PASSWORD REACT_APP_DEMO_EMAIL REACT_APP_DEMO_PASSWORD NEXT_PUBLIC_DEMO_EMAIL NEXT_PUBLIC_DEMO_PASSWORD
fi
unset demo_credentials_email demo_credentials_password demo_credentials_project_dir demo_credentials_line demo_credentials_key demo_credentials_value demo_credentials_first demo_credentials_last

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if [ -f "$project_dir/.env" ]; then
  set -a
  . "$project_dir/.env"
  set +a
fi

fail() { printf 'error: %s\n' "$*" >&2; exit 1; }
check() {
  jwt_secret="${JWT_SECRET:-}"
  default_tenant_id="${DEFAULT_TENANT_ID:-${GOVERNANCE_TENANT_ID:-${TENANT_ID:-}}}"
  case "${DATABASE_URL:-}" in postgres://*|postgresql://*) ;; *) fail "DATABASE_URL must be an explicit PostgreSQL connection string" ;; esac
  [ "${#jwt_secret}" -ge 32 ] || fail "JWT_SECRET must contain at least 32 characters"
  [ "${#default_tenant_id}" -ge 8 ] || fail "DEFAULT_TENANT_ID, GOVERNANCE_TENANT_ID, or TENANT_ID is required"
  [ -n "${OPENROUTER_API_KEY:-}" ] || fail "OPENROUTER_API_KEY is required"
  [ -n "${OPENROUTER_MODEL:-}" ] || fail "OPENROUTER_MODEL is required"
  [ "${OPENROUTER_BASE_URL:-}" = 'https://openrouter.ai/api/v1' ] || fail "OPENROUTER_BASE_URL must be https://openrouter.ai/api/v1"
  case "${BACKEND_PORT:-}" in ''|*[!0-9]*) fail "BACKEND_PORT must be an explicit integer" ;; esac
  case "${FRONTEND_PORT:-}" in ''|*[!0-9]*) fail "FRONTEND_PORT must be an explicit integer" ;; esac
  [ "$BACKEND_PORT" -ge 1024 ] && [ "$BACKEND_PORT" -le 65535 ] || fail "BACKEND_PORT must be between 1024 and 65535"
  [ "$FRONTEND_PORT" -ge 1024 ] && [ "$FRONTEND_PORT" -le 65535 ] || fail "FRONTEND_PORT must be between 1024 and 65535"
  [ "$BACKEND_PORT" != "$FRONTEND_PORT" ] || fail "BACKEND_PORT and FRONTEND_PORT must be different"
  DEFAULT_TENANT_ID="$default_tenant_id"
  export DEFAULT_TENANT_ID
  command -v node >/dev/null 2>&1 || fail "node is required"
  printf 'configuration valid\n'
}

case "${1:-start}" in
  check)
    check
    ;;
  migrate)
    check
    [ "${ALLOW_SCHEMA_MIGRATION:-0}" = 1 ] || fail "set ALLOW_SCHEMA_MIGRATION=1 for the approved migration step"
    command -v psql >/dev/null 2>&1 || fail "psql is required"
    for migration in "$project_dir"/migrations/[0-9]*.sql; do
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"
    done
    ;;
  start)
    check
    [ -f "$project_dir/backend/dist/index.js" ] || fail "backend build is missing; build explicitly"
    [ -d "$project_dir/frontend/node_modules" ] || fail "frontend dependencies are missing; install explicitly"
    for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
      lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 && fail "assigned port $port is occupied"
    done
    printf 'Starting AI Sales Outreach API on %s and UI on %s; persistent state is unchanged.\n' "$BACKEND_PORT" "$FRONTEND_PORT"
    exec node "$project_dir/runtime-launcher.js"
    ;;
  *) fail "usage: ./start.sh [check|migrate|start]" ;;
esac
