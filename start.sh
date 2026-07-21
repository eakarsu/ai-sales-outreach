#!/bin/sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

fail() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

check() {
  jwt_secret="${JWT_SECRET:-}"
  default_tenant_id="${DEFAULT_TENANT_ID:-${GOVERNANCE_TENANT_ID:-${TENANT_ID:-}}}"
  case "${DATABASE_URL:-}" in
    postgres://*|postgresql://*) ;;
    *) fail "DATABASE_URL must be an explicit PostgreSQL connection string" ;;
  esac
  [ "${#jwt_secret}" -ge 32 ] || fail "JWT_SECRET must contain at least 32 characters"
  [ "${#default_tenant_id}" -ge 8 ] || fail "DEFAULT_TENANT_ID, GOVERNANCE_TENANT_ID, or TENANT_ID is required"
  DEFAULT_TENANT_ID="$default_tenant_id"
  export DEFAULT_TENANT_ID
  if [ "${NODE_ENV:-development}" = production ]; then
    [ -n "${CLIENT_URL:-}" ] || fail "CLIENT_URL is required in production"
    [ "${ENABLE_GENERATED_FEATURES:-false}" != true ] || fail "generated features are forbidden in production"
  fi
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
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$project_dir/migrations/001_governed_outreach.sql"
    ;;
  start)
    check
    [ -f "$project_dir/backend/dist/index.js" ] || fail "backend build is missing; build explicitly"
    exec node "$project_dir/backend/dist/index.js"
    ;;
  *) fail "usage: ./start.sh [check|migrate|start]" ;;
esac
