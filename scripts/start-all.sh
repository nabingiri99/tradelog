#!/usr/bin/env bash
#
# start-all.sh
# -----------
# One-command local startup for the full TradeLog stack:
#   local MongoDB  +  backend API (port 5000)  +  frontend dev server (port 5173)
#
# The script is idempotent: if a service is already running it is left untouched.
#
# Usage:
#   ./scripts/start-all.sh            # start everything (installs deps as needed)
#   ./scripts/start-all.sh --no-mongo # skip MongoDB management
#   ./scripts/stop-all.sh             # stop backend + frontend

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOGS_DIR="${ROOT_DIR}/logs"
mkdir -p "${LOGS_DIR}"

BACKEND_DIR="${ROOT_DIR}/backend"
FRONTEND_DIR="${ROOT_DIR}/frontend"
BACKEND_LOG="${LOGS_DIR}/backend.log"
FRONTEND_LOG="${LOGS_DIR}/frontend.log"
BACKEND_PID="${LOGS_DIR}/backend.pid"
FRONTEND_PID="${LOGS_DIR}/frontend.pid"

API_URL="http://localhost:5000/api/health"
FRONTEND_URL="http://localhost:5173"

log()  { printf '\033[1;34m[start-all]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[start-all] ERROR:\033[0m %s\n' "$*" >&2; exit 1; }

port_open() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null && { exec 3<&- 3>&- || true; return 0; } || return 1; }

backend_healthy() {
  command -v curl >/dev/null 2>&1 || return 1
  curl -fsS --max-time 2 "${API_URL}" >/dev/null 2>&1
}

ensure_mongo() {
  if [ "${1:-}" = "--no-mongo" ]; then
    log "Skipping MongoDB management (--no-mongo)."
    return
  fi
  log "Ensuring local MongoDB is running..."
  bash "${ROOT_DIR}/scripts/setup-local-db.sh" --ensure
}

ensure_deps() {
  local dir="$1"
  if [ ! -d "${dir}/node_modules" ]; then
    log "Installing dependencies in ${dir}..."
    (cd "${dir}" && npm install --no-audit --no-fund)
  fi
}

ensure_backend_env() {
  local env_file="${BACKEND_DIR}/.env"
  if [ ! -f "${env_file}" ]; then
    log "Creating backend/.env from .env.example..."
    cp "${BACKEND_DIR}/.env.example" "${env_file}"
  fi
  if grep -qE '^JWT_SECRET=(change-me-to-a-long-random-string)?$' "${env_file}"; then
    log "Generating a random JWT_SECRET..."
    local secret
    secret="$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")"
    sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=${secret}|" "${env_file}" && rm -f "${env_file}.bak"
  fi
}

start_backend() {
  if backend_healthy; then
    log "Backend already running and healthy at ${API_URL}."
    return
  fi
  ensure_deps "${BACKEND_DIR}"
  ensure_backend_env
  log "Starting backend on port 5000..."
  (cd "${BACKEND_DIR}" && nohup node server.js > "${BACKEND_LOG}" 2>&1 & echo $! > "${BACKEND_PID}")
  log "Waiting for backend health check..."
  for _ in $(seq 1 30); do
    backend_healthy && { log "Backend is healthy at ${API_URL}"; return; }
    sleep 1
  done
  warn_or_die_backend
}

warn_or_die_backend() {
  if [ -f "${BACKEND_LOG}" ]; then
    cat "${BACKEND_LOG}" >&2
  fi
  die "Backend did not become healthy. See ${BACKEND_LOG}"
}

start_frontend() {
  if port_open 5173; then
    log "Frontend already running at ${FRONTEND_URL}."
    return
  fi
  ensure_deps "${FRONTEND_DIR}"
  log "Starting frontend dev server on port 5173..."
  (cd "${FRONTEND_DIR}" && nohup node ./node_modules/vite/bin/vite.js > "${FRONTEND_LOG}" 2>&1 & echo $! > "${FRONTEND_PID}")
  log "Waiting for frontend..."
  for _ in $(seq 1 60); do
    port_open 5173 && { log "Frontend is up at ${FRONTEND_URL}"; return; }
    sleep 1
  done
  if [ -f "${FRONTEND_LOG}" ]; then
    cat "${FRONTEND_LOG}" >&2
  fi
  die "Frontend did not start. See ${FRONTEND_LOG}"
}

MODE="${1:-}"
ensure_mongo "${MODE}"
start_backend
start_frontend

log ""
log "============================== TradeLog is running =============================="
log "  Frontend : ${FRONTEND_URL}"
log "  Backend  : ${API_URL}"
log "  MongoDB  : mongodb://127.0.0.1:27017/tradelog"
log ""
log "  Logs     : ${LOGS_DIR}/backend.log , ${LOGS_DIR}/frontend.log"
log "  Stop     : ./scripts/stop-all.sh"
log "================================================================================"
