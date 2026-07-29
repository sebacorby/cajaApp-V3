#!/bin/bash
set -e

if command -v cygpath > /dev/null 2>&1; then
  ROOT="$(cygpath -u 'I:\cajaApp-V3')"
elif [ -d /mnt/i/cajaApp-V3 ]; then
  ROOT="/mnt/i/cajaApp-V3"
elif [ -d /i/cajaApp-V3 ]; then
  ROOT="/i/cajaApp-V3"
else
  echo "ERROR: no se pudo resolver I:\\cajaApp-V3 desde Bash"
  exit 1
fi

BACKEND="$ROOT/workspace/backend"
FRONTEND="$ROOT/workspace/frontend"

printf 'ROOT=%s\nBACKEND=%s\nFRONTEND=%s\n' "$ROOT" "$BACKEND" "$FRONTEND"

test -d "$BACKEND" || { echo "ERROR: no existe $BACKEND"; exit 1; }
test -d "$FRONTEND" || { echo "ERROR: no existe $FRONTEND"; exit 1; }

NODE_BIN="$(command -v node.exe || command -v node || true)"
NPM_BIN="$(command -v npm.cmd || command -v npm || true)"
NPX_BIN="$(command -v npx.cmd || command -v npx || true)"

echo "NODE_BIN=$NODE_BIN"
echo "NPM_BIN=$NPM_BIN"
echo "NPX_BIN=$NPX_BIN"

test -n "$NODE_BIN" || { echo "ERROR: Node.js no está disponible"; exit 1; }
test -n "$NPM_BIN" || { echo "ERROR: npm no está disponible"; exit 1; }
test -n "$NPX_BIN" || { echo "ERROR: npx no está disponible"; exit 1; }

echo "NODE_READY=$NODE_BIN"
