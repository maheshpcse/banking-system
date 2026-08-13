#!/bin/sh
# Runtime entry for banking-system Nginx image.
# MAINTENANCE_MODE=1 → serve maintenance page as site root.
set -eu

HTML_ROOT="${HTML_ROOT:-/usr/share/nginx/html}"
MAINT_SRC="${MAINT_SRC:-/usr/share/nginx/maintenance/index.html}"

APP_INDEX="${HTML_ROOT}/index.html.app"

if [ "${MAINTENANCE_MODE:-0}" = "1" ] || [ -f "${HTML_ROOT}/.maintenance" ]; then
  echo "[banking-system] Maintenance mode ON — serving maintenance page"
  if [ -f "$MAINT_SRC" ]; then
    cp "$MAINT_SRC" "${HTML_ROOT}/index.html"
    cp "$MAINT_SRC" "${HTML_ROOT}/404.html" 2>/dev/null || true
    : > "${HTML_ROOT}/.maintenance"
  else
    echo "[banking-system] WARN: maintenance source missing at $MAINT_SRC"
  fi
else
  echo "[banking-system] Maintenance mode OFF — serving application bundle"
  if [ -f "$APP_INDEX" ]; then
    cp "$APP_INDEX" "${HTML_ROOT}/index.html"
    cp "$APP_INDEX" "${HTML_ROOT}/404.html" 2>/dev/null || true
  fi
  rm -f "${HTML_ROOT}/.maintenance"
fi

exec nginx -g "daemon off;"
