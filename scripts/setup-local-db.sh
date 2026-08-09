#!/usr/bin/env bash
#
# setup-local-db.sh
# -----------------
# Installs (if missing) and starts a LOCAL MongoDB for the TradeLog project.
# No cloud database is required.
#
# Usage:
#   ./scripts/setup-local-db.sh            # install + start + verify
#   ./scripts/setup-local-db.sh --ensure   # only start if not already running
#   ./scripts/setup-local-db.sh --stop     # stop a manually-started mongod
#
# Supported: Debian/Ubuntu (apt), RHEL/CentOS/Fedora (yum/dnf),
#            Arch (pacman), macOS (Homebrew). Windows: see scripts/setup-local-db.ps1

set -euo pipefail

MONGO_HOST="127.0.0.1"
MONGO_PORT="27017"
MONGO_DB_PATH="${MONGODB_DBPATH:-/var/lib/mongodb}"
MONGO_LOG="${MONGODB_LOG:-/var/log/mongod.log}"

log()  { printf '\033[1;34m[setup-local-db]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[setup-local-db] WARN:\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[setup-local-db] ERROR:\033[0m %s\n' "$*" >&2; exit 1; }

is_running() {
  if (exec 3<>"/dev/tcp/${MONGO_HOST}/${MONGO_PORT}") 2>/dev/null; then
    exec 3<&- 3>&- || true
    return 0
  fi
  return 1
}

is_systemd() {
  [ "$(ps -p 1 -o comm= 2>/dev/null || true)" = "systemd" ]
}

install_mongod() {
  local os
  os="$(uname -s)"

  case "$os" in
    Linux)
      if command -v apt-get >/dev/null 2>&1; then
        log "Installing MongoDB via official MongoDB repo (apt)..."
        local distro
        distro="$(grep -oP '(?<=^VERSION_CODENAME=).*' /etc/os-release 2>/dev/null || true)"
        [ -z "$distro" ] && die "Could not detect Debian/Ubuntu codename from /etc/os-release"
        curl -fsSL "https://www.mongodb.org/static/pgp/server-8.0.asc" \
          | gpg --dearmor -o /usr/share/keyrings/mongodb-server-8.0.gpg
        echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/${distro}/mongodb-org/8.0 ${distro}/mongodb-org/8.0 main" \
          > /tmp/mongodb-org-8.0.list
        # Fall back to a distro-less path in case codename mapping fails
        cp /tmp/mongodb-org-8.0.list /etc/apt/sources.list.d/mongodb-org-8.0.list
        DEBIAN_FRONTEND=noninteractive apt-get update
        DEBIAN_FRONTEND=noninteractive apt-get install -y mongodb-org
      elif command -v dnf >/dev/null 2>&1; then
        log "Installing MongoDB via official MongoDB repo (dnf)..."
        local relver
        relver="$(rpm -E %rhel 2>/dev/null || echo 9)"
        cat > /etc/yum.repos.d/mongodb-org-8.0.repo <<EOF
[mongodb-org-8.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/8.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-8.0.asc
EOF
        dnf install -y mongodb-org
      elif command -v yum >/dev/null 2>&1; then
        log "Installing MongoDB via official MongoDB repo (yum)..."
        cat > /etc/yum.repos.d/mongodb-org-8.0.repo <<EOF
[mongodb-org-8.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/8.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-8.0.asc
EOF
        yum install -y mongodb-org
      elif command -v pacman >/dev/null 2>&1; then
        log "Installing MongoDB (pacman)..."
        pacman -Sy --noconfirm mongodb
      else
        die "Unsupported Linux package manager. Install MongoDB manually from https://www.mongodb.com/docs/manual/installation/"
      fi
      ;;
    Darwin)
      if ! command -v brew >/dev/null 2>&1; then
        die "Homebrew is required on macOS. Install it from https://brew.sh first."
      fi
      log "Installing MongoDB via Homebrew (mongodb-community)..."
      brew tap mongodb/brew
      brew install mongodb-community
      ;;
    *)
      die "Unsupported OS '$os'. On Windows use scripts/setup-local-db.ps1."
      ;;
  esac

  command -v mongod >/dev/null 2>&1 || die "mongod still not found after install"
}

start_mongod() {
  log "Starting MongoDB..."
  if is_systemd; then
    systemctl enable --now mongod >/dev/null 2>&1 || systemctl start mongod
  elif [ "$(uname -s)" = "Darwin" ] && command -v brew >/dev/null 2>&1; then
    brew services start mongodb-community >/dev/null 2>&1 \
      || mongod --dbpath "${MONGO_DB_PATH}" --bind_ip "${MONGO_HOST}" --port "${MONGO_PORT}" --logpath "${MONGO_LOG}" --fork
  else
    mkdir -p "${MONGO_DB_PATH}"
    mongod --dbpath "${MONGO_DB_PATH}" \
      --bind_ip "${MONGO_HOST}" \
      --port "${MONGO_PORT}" \
      --logpath "${MONGO_LOG}" \
      --fork
  fi
}

wait_for_mongo() {
  log "Waiting for MongoDB on ${MONGO_HOST}:${MONGO_PORT}..."
  for _ in $(seq 1 30); do
    if is_running; then
      log "MongoDB is ready at mongodb://${MONGO_HOST}:${MONGO_PORT}/tradelog"
      return 0
    fi
    sleep 1
  done
  die "MongoDB did not become reachable on port ${MONGO_PORT}. Check ${MONGO_LOG}"
}

stop_mongod() {
  log "Stopping MongoDB..."
  if is_systemd; then
    systemctl stop mongod
  elif [ "$(uname -s)" = "Darwin" ] && command -v brew >/dev/null 2>&1; then
    brew services stop mongodb-community
  else
    # Gracefully shut down via the mongo admin command over TCP
    if is_running; then
      node -e "const{MongoClient}=require('mongodb');const c=new MongoClient('mongodb://127.0.0.1:27017/admin');c.connect().then(()=>c.db().admin().command({shutdown:1})).catch(()=>{})" 2>/dev/null \
        || pkill -x mongod || true
    fi
  fi
  log "MongoDB stopped."
}

case "${1:-}" in
  --ensure)
    if is_running; then
      log "MongoDB already running at ${MONGO_HOST}:${MONGO_PORT}."
    else
      command -v mongod >/dev/null 2>&1 || install_mongod
      start_mongod
      wait_for_mongo
    fi
    ;;
  --stop)
    stop_mongod
    ;;
  *)
    if is_running; then
      log "MongoDB already running at ${MONGO_HOST}:${MONGO_PORT}."
    else
      command -v mongod >/dev/null 2>&1 || install_mongod
      start_mongod
      wait_for_mongo
    fi
    ;;
esac
