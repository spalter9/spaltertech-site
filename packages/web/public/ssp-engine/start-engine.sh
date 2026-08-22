#!/usr/bin/env bash
# Local-only Surreal Engine static server (no cloud tunnel / no port 5173).
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

pick_port() {
  local port="${1:-8765}"
  while command -v lsof >/dev/null 2>&1 && lsof -i ":${port}" >/dev/null 2>&1; do
    port=$((port + 1))
  done
  echo "$port"
}

PORT="$(pick_port "${PORT:-8765}")"
HOST="${HOST:-127.0.0.1}"

echo ""
echo "  SSP // The Surreal Engine (local static server)"
echo "  ───────────────────────────────────────────────"
echo "  URL:      http://${HOST}:${PORT}/"
echo "  Folder:   ${DIR}"
echo "  Passcode: 8888 | SPALTER | SSP2026"
echo "  Stop:     Ctrl+C"
echo ""

if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "$PORT" --bind "$HOST"
fi

if command -v node >/dev/null 2>&1; then
  exec node "$(dirname "$0")/start-engine.mjs" --port "$PORT" --host "$HOST"
fi

echo "Install Python 3 or Node.js to run the local engine server." >&2
exit 1
