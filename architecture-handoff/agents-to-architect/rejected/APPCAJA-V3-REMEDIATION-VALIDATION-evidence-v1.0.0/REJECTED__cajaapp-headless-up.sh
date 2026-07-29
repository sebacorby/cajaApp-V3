#!/bin/bash
# cajaapp-headless-up.sh — Arranque del ecosistema CajaApp V3 en Bash nativo
set -euo pipefail

BACKEND_PORT="${BACKEND_PORT:-11436}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
STARTUP_TIMEOUT="${STARTUP_TIMEOUT:-180}"
NODE_HOME="${NODE_HOME:-/i/Tools/node-v24.18.0-win-x64}"
LOG_DIR="${LOG_DIR:-$TEMP/cajaapp-headless}"
STATE_FILE="${STATE_FILE:-$LOG_DIR/state.json}"

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/workspace/backend"
FRONTEND_DIR="$PROJECT_ROOT/workspace/frontend"
BACKEND_HEALTH_URL="http://127.0.0.1:$BACKEND_PORT/health"
FRONTEND_URL="http://127.0.0.1:$FRONTEND_PORT"
API_BASE_URL="http://127.0.0.1:$BACKEND_PORT"

BACKEND_LOG="$LOG_DIR/backend.log"
BACKEND_ERR="$LOG_DIR/backend.err.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
FRONTEND_ERR="$LOG_DIR/frontend.err.log"

REQUIRED_NODE_VERSION="v24.18.0"
JSON_ONLY=0
STOP_MODE=0
STATUS_MODE=0
RESTART_MODE=0
REBUILD=0
SKIP_MIGRATE=0

for arg in "$@"; do
  case "$arg" in
    -JsonOnly) JSON_ONLY=1 ;;
    -Stop)     STOP_MODE=1 ;;
    -Status)   STATUS_MODE=1 ;;
    -Restart)  RESTART_MODE=1 ;;
    -Rebuild)  REBUILD=1 ;;
    -SkipMigrate) SKIP_MIGRATE=1 ;;
  esac
done

write_step() {
  if [[ $JSON_ONLY -eq 0 ]]; then
    echo ""
    echo "==> $1"
  fi
}

write_kv() {
  if [[ $JSON_ONLY -eq 0 ]]; then
    printf "    %-14s %s\n" "$1:" "$2"
  fi
}

json_out() {
  echo "$1"
}

find_node() {
  local preferred="$NODE_HOME/node.exe"
  if [[ -x "$preferred" ]]; then
    local ver
    ver=$("$preferred" --version 2>/dev/null || true)
    if [[ "$ver" == "$REQUIRED_NODE_VERSION" ]]; then
      echo "$preferred"
      return 0
    fi
  fi
  local candidate
  candidate=$(command -v node.exe 2>/dev/null || command -v node 2>/dev/null || true)
  if [[ -n "$candidate" ]]; then
    local ver
    ver=$("$candidate" --version 2>/dev/null || true)
    if [[ "$ver" == "$REQUIRED_NODE_VERSION" ]]; then
      echo "$candidate"
      return 0
    fi
  fi
  echo "ERROR: CajaApp V3 requiere Node.js $REQUIRED_NODE_VERSION. No se encontró node.exe válido." >&2
  return 1
}

get_node_version() {
  "$1" --version 2>/dev/null || true
}

backup_sqlite() {
  local backend_path="$1"
  local env_file="$backend_path/.env"
  [[ -f "$env_file" ]] || return 0
  local db_line
  db_line=$(grep -m1 '^\s*DATABASE_URL\s*=' "$env_file" || true)
  [[ -n "$db_line" ]] || return 0
  local db_url
  db_url=$(echo "$db_line" | sed 's/^[^=]*=//' | tr -d ' "'\''')
  [[ "$db_url" == file:* ]] || return 0
  local db_path="${db_url#file:}"
  if [[ ! "$db_path" =~ ^[A-Za-z]:|^/ ]]; then
    db_path="$backend_path/prisma/$db_path"
  fi
  [[ -f "$db_path" ]] || return 0
  local backup_dir="$TEMP/cajaapp-sqlite-backups"
  mkdir -p "$backup_dir"
  local timestamp
  timestamp=$(date +"%Y%m%d-%H%M%S")
  local db_name
  db_name=$(basename "$db_path")
  cp -f "$db_path" "$backup_dir/$timestamp-$db_name"
  if [[ $JSON_ONLY -eq 0 ]]; then
    echo "Respaldo SQLite creado: $backup_dir/$timestamp-$db_name"
  fi
}

read_state() {
  if [[ -f "$STATE_FILE" ]]; then
    cat "$STATE_FILE" 2>/dev/null || echo "null"
  else
    echo "null"
  fi
}

clear_state() {
  rm -f "$STATE_FILE"
}

kill_port() {
  local port="$1"
  local name="$2"
  local pids
  pids=$(netstat -ano 2>/dev/null | grep "LISTENING" | grep ":$port " | awk '{print $NF}' | sort -u || true)
  if [[ -n "$pids" ]]; then
    if [[ $JSON_ONLY -eq 0 ]]; then
      echo "$name : finalizando PIDs en puerto $port: $pids"
    fi
    for p in $pids; do
      taskkill //PID "$p" //T //F 2>/dev/null || true
    done
    local deadline
    deadline=$(($(date +%s) + 15))
    while true; do
      local remaining
      remaining=$(netstat -ano 2>/dev/null | grep "LISTENING" | grep ":$port " | awk '{print $NF}' | sort -u || true)
      [[ -z "$remaining" ]] && break
      [[ $(date +%s) -ge $deadline ]] && break
      sleep 0.5
    done
  fi
}

stop_existing() {
  local state
  state=$(read_state)
  if [[ "$state" != "null" ]]; then
    local bpid fpid
    bpid=$(echo "$state" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('backend',{}).get('pid',''))" 2>/dev/null || true)
    fpid=$(echo "$state" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('frontend',{}).get('pid',''))" 2>/dev/null || true)
    [[ -n "$bpid" ]] && taskkill //PID "$bpid" //T //F 2>/dev/null || true
    [[ -n "$fpid" ]] && taskkill //PID "$fpid" //T //F 2>/dev/null || true
  fi
  kill_port "$BACKEND_PORT" "Backend"
  kill_port "$FRONTEND_PORT" "Frontend"
  clear_state
}

npm_in_dir() {
  local wd="$1"
  local cmd="$2"
  local desc="$3"
  local tmpOut tmpErr
  tmpOut=$(mktemp)
  tmpErr=$(mktemp)
  local ec=0
  (cd "$wd" && eval "$cmd" >"$tmpOut" 2>"$tmpErr") || ec=$?
  if [[ $ec -ne 0 ]]; then
    if [[ -s "$tmpOut" ]]; then
      echo "--- stdout ---" >&2
      cat "$tmpOut" >&2
    fi
    if [[ -s "$tmpErr" ]]; then
      echo "--- stderr ---" >&2
      cat "$tmpErr" >&2
    fi
    rm -f "$tmpOut" "$tmpErr"
    echo "ERROR: $desc falló con código $ec" >&2
    return 1
  fi
  rm -f "$tmpOut" "$tmpErr"
}

wait_http_ready() {
  local url="$1"
  local timeout="$2"
  local name="$3"
  local deadline
  deadline=$(($(date +%s) + timeout))
  local attempts=0
  while [[ $(date +%s) -lt $deadline ]]; do
    attempts=$((attempts + 1))
    local code
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null || echo "000")
    if [[ "$code" -ge 200 && "$code" -lt 500 ]]; then
      echo "$attempts"
      return 0
    fi
    sleep 1
  done
  echo "0"
  return 1
}

if [[ $STATUS_MODE -eq 1 ]]; then
  if [[ -f "$STATE_FILE" ]]; then
    cat "$STATE_FILE"
    exit 0
  else
    json_out '{"ok":false,"reason":"no state file","stateFile":"'$STATE_FILE'"}'
    exit 3
  fi
fi

if [[ $STOP_MODE -eq 1 ]]; then
  write_step "Deteniendo run previo (si existe)"
  stop_existing
  json_out '{"ok":true,"stopped":[],"stateFile":"'$STATE_FILE'"}'
  exit 0
fi

if [[ $RESTART_MODE -eq 1 ]]; then
  write_step "Restart: deteniendo run previo"
  stop_existing
fi

script_start=$(date +%s)
mkdir -p "$LOG_DIR"

write_step "Validando entorno"
[[ -d "$BACKEND_DIR" ]]  || { echo "ERROR: Directorio backend no encontrado: $BACKEND_DIR" >&2; exit 1; }
[[ -d "$FRONTEND_DIR" ]] || { echo "ERROR: Directorio frontend no encontrado: $FRONTEND_DIR" >&2; exit 1; }

NODE_EXE=$(find_node)
NODE_VER=$(get_node_version "$NODE_EXE")
write_kv "node" "$NODE_VER  ($NODE_EXE)"

write_step "Kill-all de procesos node.exe (reset duro)"
if taskkill //IM node.exe //F 2>/dev/null; then
  write_kv "taskkill" "procesos node.exe finalizados"
else
  write_kv "taskkill" "no habia procesos node.exe"
fi
sleep 2

write_step "Deteniendo instancias previas en puertos $BACKEND_PORT y $FRONTEND_PORT (defensa adicional)"
stop_existing

export PATH="$NODE_HOME:$PATH"

if [[ $SKIP_MIGRATE -eq 0 ]]; then
  write_step "Respaldo SQLite + Prisma"
  backup_sqlite "$BACKEND_DIR"
  npm_in_dir "$BACKEND_DIR" "npm run prisma:generate" "prisma:generate"
  write_kv "prisma" "generate OK"
  npm_in_dir "$BACKEND_DIR" "npm run prisma:migrate:deploy" "prisma:migrate:deploy"
  write_kv "prisma" "migrate deploy OK"
else
  write_step "Prisma omitido (-SkipMigrate)"
fi

backend_dist_main="$BACKEND_DIR/dist/main.js"
if [[ $REBUILD -eq 1 ]] || [[ ! -f "$backend_dist_main" ]]; then
  write_step "Compilando backend (npm run build)"
  npm_in_dir "$BACKEND_DIR" "npm run build" "backend build"
else
  write_step "Backend dist/main.js ya existe, saltando build (-Rebuild no enviado)"
fi

frontend_standalone="$FRONTEND_DIR/.next/standalone/server.js"
if [[ $REBUILD -eq 1 ]] || [[ ! -f "$frontend_standalone" ]]; then
  write_step "Compilando frontend (npm run build)"
  npm_in_dir "$FRONTEND_DIR" "npm run build" "frontend build"
else
  write_step "Frontend .next/standalone/server.js ya existe, saltando build (-Rebuild no enviado)"
fi

write_step "Arrancando backend (node dist/main.js)"
export PORT="$BACKEND_PORT"
export HOST="127.0.0.1"
: > "$BACKEND_LOG"
: > "$BACKEND_ERR"
(
  cd "$BACKEND_DIR"
  "$NODE_EXE" dist/main.js >>"$BACKEND_LOG" 2>>"$BACKEND_ERR" &
  echo $!
) > "$LOG_DIR/backend.pid"
B_PID=$(cat "$LOG_DIR/backend.pid")
rm -f "$LOG_DIR/backend.pid"
write_kv "pid" "$B_PID"

B_ATTEMPTS=$(wait_http_ready "$BACKEND_HEALTH_URL" "$STARTUP_TIMEOUT" "Backend")
if [[ "$B_ATTEMPTS" == "0" ]]; then
  echo "ERROR: Backend no respondió en $BACKEND_HEALTH_URL dentro de $STARTUP_TIMEOUT s" >&2
  stop_existing
  exit 1
fi
write_kv "health" "OK en ${B_ATTEMPTS} intento(s)"

write_step "Arrancando frontend (node .next/standalone/server.js)"
export PORT="$FRONTEND_PORT"
export HOSTNAME="127.0.0.1"
export NEXT_PUBLIC_API_BASE_URL="$API_BASE_URL"
: > "$FRONTEND_LOG"
: > "$FRONTEND_ERR"
(
  cd "$FRONTEND_DIR"
  "$NODE_EXE" .next/standalone/server.js >>"$FRONTEND_LOG" 2>>"$FRONTEND_ERR" &
  echo $!
) > "$LOG_DIR/frontend.pid"
F_PID=$(cat "$LOG_DIR/frontend.pid")
rm -f "$LOG_DIR/frontend.pid"
write_kv "pid" "$F_PID"

F_ATTEMPTS=$(wait_http_ready "$FRONTEND_URL" "$STARTUP_TIMEOUT" "Frontend")
if [[ "$F_ATTEMPTS" == "0" ]]; then
  echo "ERROR: Frontend no respondió en $FRONTEND_URL dentro de $STARTUP_TIMEOUT s" >&2
  taskkill //PID "$B_PID" //T //F 2>/dev/null || true
  stop_existing
  exit 1
fi
write_kv "ready" "OK en ${F_ATTEMPTS} intento(s)"

script_end=$(date +%s)
duration=$((script_end - script_start))

cat > "$STATE_FILE" <<EOF
{
  "ok": true,
  "startedAt": "$(date +%Y-%m-%dT%H:%M:%S%z)",
  "durationSeconds": $duration,
  "node": {
    "version": "$NODE_VER",
    "path": "$NODE_EXE"
  },
  "backend": {
    "pid": $B_PID,
    "port": $BACKEND_PORT,
    "healthUrl": "$BACKEND_HEALTH_URL",
    "apiBaseUrl": "$API_BASE_URL",
    "logPath": "$BACKEND_LOG",
    "errLogPath": "$BACKEND_ERR",
    "readyAfterChecks": $B_ATTEMPTS
  },
  "frontend": {
    "pid": $F_PID,
    "port": $FRONTEND_PORT,
    "url": "$FRONTEND_URL",
    "logPath": "$FRONTEND_LOG",
    "errLogPath": "$FRONTEND_ERR",
    "readyAfterChecks": $F_ATTEMPTS
  },
  "stopHint": "Run with -Stop, or: taskkill //PID $B_PID //T //F && taskkill //PID $F_PID //T //F"
}
EOF

if [[ $JSON_ONLY -eq 1 ]]; then
  cat "$STATE_FILE"
else
  write_step "Listo"
  write_kv "backend.pid"  "$B_PID"
  write_kv "frontend.pid" "$F_PID"
  write_kv "backend.url"  "$API_BASE_URL"
  write_kv "frontend.url" "$FRONTEND_URL"
  write_kv "state file"   "$STATE_FILE"
  write_kv "backend log"  "$BACKEND_LOG"
  write_kv "backend err"  "$BACKEND_ERR"
  write_kv "frontend log" "$FRONTEND_LOG"
  write_kv "frontend err" "$FRONTEND_ERR"
  echo ""
  echo "----- JSON (parseable por agente) -----"
  cat "$STATE_FILE"
fi
exit 0
