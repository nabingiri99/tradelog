#!/usr/bin/env bash
#
# stop-all.sh
# ----------
# Stops the backend (port 5000) and frontend dev server (port 5173) started by
# ./scripts/start-all.sh. Local MongoDB is left running (it is a service you can
# manage with ./scripts/setup-local-db.sh --stop).
#
# Usage:
#   ./scripts/stop-all.sh

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOGS_DIR="${ROOT_DIR}/logs"
BACKEND_PID="${LOGS_DIR}/backend.pid"
FRONTEND_PID="${LOGS_DIR}/frontend.pid"

log() { printf '\033[1;34m[stop-all]\033[0m %s\n' "$*"; }

kill_pid_file() {
  local file="$1" name="$2"
  if [ -f "${file}" ]; then
    local pid
    pid="$(cat "${file}" 2>/dev/null || true)"
    if [ -n "${pid}" ] && kill -0 "${pid}" 2>/dev/null; then
      log "Stopping ${name} (pid ${pid})..."
      kill "${pid}" 2>/dev/null || true
      for _ in $(seq 1 10); do
        kill -0 "${pid}" 2>/dev/null || break
        sleep 0.5
      done
      kill -9 "${pid}" 2>/dev/null || true
    fi
    rm -f "${file}"
  fi
}

kill_port() {
  local port="$1" name="$2"
  local pids=()
  if command -v lsof >/dev/null 2>&1; then
    pids=($(lsof -ti "tcp:${port}" 2>/dev/null || true))
  elif command -v ss >/dev/null 2>&1; then
    pids=($(ss -ltnp 2>/dev/null | grep ":${port} " | grep -oP 'pid=\K[0-9]+' | sort -u || true))
  fi
  if [ "${#pids[@]}" -gt 0 ]; then
    log "Stopping ${name} on port ${port} (${pids[*]})..."
    kill "${pids[@]}" 2>/dev/null || true
    sleep 1
    kill -9 "${pids[@]}" 2>/dev/null || true
  fi
}

kill_pid_file "${BACKEND_PID}" "backend"
kill_pid_file "${FRONTEND_PID}" "frontend"

# Fallback: ensure nothing is still holding the dev ports
kill_port 5000 "backend"
kill_port 5173 "frontend"

log "Backend and frontend stopped. (MongoDB still running; stop it with ./scripts/setup-local-db.sh --stop)"
