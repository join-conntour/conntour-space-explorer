#!/usr/bin/env bash
# One-command local setup for Conntour Space Explorer (dev stack).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE=(docker compose -f docker-compose.dev.yml)
NO_BUILD=0
FORCE_INSTALL=0
RESET=0

usage() {
  cat <<'EOF'
Usage: ./scripts/setup.sh [--no-build] [--install] [--reset]

  --no-build   Skip image rebuild (docker compose up -d)
  --install    Force frontend npm install inside the container
  --reset      Destroy containers and the Postgres volume, then rebuild
EOF
}

for arg in "$@"; do
  case "$arg" in
    --no-build) NO_BUILD=1 ;;
    --install) FORCE_INSTALL=1 ;;
    --reset) RESET=1 ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker CLI is required but was not found." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required (docker compose)." >&2
  exit 1
fi

ensure_docker_daemon() {
  if docker info >/dev/null 2>&1; then
    return 0
  fi
  if [[ "$(uname -s)" == "Darwin" ]]; then
    echo "Docker daemon is not running. Launching Docker Desktop..."
    open -a Docker || true
    for _ in $(seq 1 60); do
      if docker info >/dev/null 2>&1; then
        echo "Docker daemon is ready."
        return 0
      fi
      sleep 2
    done
  fi
  echo "Docker daemon did not become ready. Start Docker and retry." >&2
  exit 1
}

wait_for_http() {
  local url="$1"
  local label="$2"
  local attempts="${3:-90}"
  for i in $(seq 1 "$attempts"); do
    if curl -sf -o /dev/null "$url"; then
      echo "[ok] $label ($url)"
      return 0
    fi
    sleep 2
  done
  echo "[fail] Timed out waiting for $label ($url)" >&2
  echo "Hint: ${COMPOSE[*]} logs -f" >&2
  exit 1
}

wait_for_db() {
  local attempts=90
  for i in $(seq 1 "$attempts"); do
    if "${COMPOSE[@]}" exec -T db pg_isready -U postgres -d space_explorer >/dev/null 2>&1; then
      echo "[ok] database healthy"
      return 0
    fi
    sleep 2
  done
  echo "[fail] Timed out waiting for database health" >&2
  echo "Hint: ${COMPOSE[*]} logs -f db" >&2
  exit 1
}

ensure_docker_daemon

if [[ -z "${ADMIN_TOKEN:-}" ]]; then
  export ADMIN_TOKEN="dev-admin-token"
fi

if [[ "$RESET" -eq 1 ]]; then
  echo "Resetting containers and volumes..."
  "${COMPOSE[@]}" down -v
fi

if [[ "$NO_BUILD" -eq 1 ]]; then
  echo "Starting stack without rebuild..."
  "${COMPOSE[@]}" up -d
else
  echo "Building and starting stack..."
  "${COMPOSE[@]}" up --build -d
fi

wait_for_db
wait_for_http "http://localhost:5001/api/sources" "backend API"
wait_for_http "http://localhost:3001" "frontend"

echo "Applying additive schema and seed data..."
"${COMPOSE[@]}" exec -T backend uv run python scripts/seed_db.py

need_install=0
if [[ "$FORCE_INSTALL" -eq 1 ]]; then
  need_install=1
elif ! "${COMPOSE[@]}" exec -T frontend test -d node_modules/react-router-dom >/dev/null 2>&1; then
  need_install=1
fi

if [[ "$need_install" -eq 1 ]]; then
  echo "Installing frontend dependencies..."
  "${COMPOSE[@]}" exec -T frontend npm install
else
  echo "[ok] frontend dependencies already present"
fi

cat <<EOF

Space Explorer is ready.

  App:       http://localhost:3001
  API docs:  http://localhost:5001/docs
  Admin:     http://localhost:3001/admin
  Admin token env: ADMIN_TOKEN (default: ${ADMIN_TOKEN})

Follow logs with:
  ${COMPOSE[*]} logs -f
EOF
