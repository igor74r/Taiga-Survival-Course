#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GAME_DIR="$ROOT/GAME_TAIGA_IDLE"
PORT=8000
PID_FILE="/tmp/taiga-idle-http.pid"

if [[ ! -f "$GAME_DIR/index.html" ]]; then
  echo "TAIGA game entry point not found: $GAME_DIR/index.html" >&2
  exit 1
fi

# Reuse only the server that actually serves the TAIGA game.
if [[ -f "$PID_FILE" ]]; then
  PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "$PID" ]] && kill -0 "$PID" 2>/dev/null; then
    if curl -fsS "http://127.0.0.1:$PORT/index.html" | grep -q '<title>TAIGA — IDLE SURVIVAL</title>'; then
      exit 0
    fi
  fi
  rm -f "$PID_FILE"
fi

# Do not silently accept an unrelated service already occupying port 8000.
if curl -fsS "http://127.0.0.1:$PORT/index.html" 2>/dev/null | grep -q '<title>TAIGA — IDLE SURVIVAL</title>'; then
  exit 0
fi

nohup python3 -m http.server "$PORT" --bind 0.0.0.0 --directory "$GAME_DIR" >/tmp/taiga-idle-http.log 2>&1 &
echo "$!" > "$PID_FILE"

for attempt in {1..30}; do
  if curl -fsS "http://127.0.0.1:$PORT/index.html" 2>/dev/null | grep -q '<title>TAIGA — IDLE SURVIVAL</title>'; then
    echo "TAIGA is ready at http://127.0.0.1:$PORT/"
    exit 0
  fi
  sleep 1
done

echo "TAIGA server failed to become ready. Log: /tmp/taiga-idle-http.log" >&2
cat /tmp/taiga-idle-http.log >&2 || true
exit 1
