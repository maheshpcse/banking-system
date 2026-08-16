#!/usr/bin/env bash
# Local / VPS deploy helper: maintenance page → publish dist → live app.
# Does NOT run ng build unless --build is passed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DIST_PATH="${DIST_PATH:-dist/client}"
MAINT_PATH="${MAINT_PATH:-maintenance/index.html}"
TARGET_PATH="${TARGET_PATH:-}"
DO_BUILD=0
SKIP_MAINT=0

usage() {
  cat <<EOF
Usage: $0 [--build] [--skip-maintenance] [--target DIR] [--dist DIR]
  --build              Run ng build before copy
  --skip-maintenance   Publish app only
  --target DIR         Live web root (required to apply)
  --dist DIR           Built app folder (default: dist/client)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build) DO_BUILD=1; shift ;;
    --skip-maintenance) SKIP_MAINT=1; shift ;;
    --target) TARGET_PATH="$2"; shift 2 ;;
    --dist) DIST_PATH="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1"; usage; exit 1 ;;
  esac
done

step() { printf '\n==> %s\n' "$1"; }

[[ -f "$MAINT_PATH" ]] || { echo "Missing $MAINT_PATH"; exit 1; }

if [[ "$DO_BUILD" -eq 1 ]]; then
  step "Production build"
  npx ng build --configuration production
fi

[[ -d "$DIST_PATH" ]] || { echo "Missing dist: $DIST_PATH"; exit 1; }

if [[ -z "$TARGET_PATH" ]]; then
  step "Dry run (no --target)"
  echo "Would enable maintenance from: $MAINT_PATH"
  echo "Would publish bundle from:    $DIST_PATH"
  exit 0
fi

mkdir -p "$TARGET_PATH"

cleanup_fail() {
  echo "Deploy failed — restoring maintenance page" >&2
  cp "$MAINT_PATH" "$TARGET_PATH/index.html" 2>/dev/null || true
  : > "$TARGET_PATH/.maintenance" 2>/dev/null || true
}
trap cleanup_fail ERR

if [[ "$SKIP_MAINT" -eq 0 ]]; then
  step "Enable maintenance page"
  cp "$MAINT_PATH" "$TARGET_PATH/index.html"
  cp "$MAINT_PATH" "$TARGET_PATH/404.html" 2>/dev/null || true
  : > "$TARGET_PATH/.maintenance"
  sleep 2
fi

step "Publish application files"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete --exclude '.maintenance' "$DIST_PATH"/ "$TARGET_PATH"/
else
  cp -a "$DIST_PATH"/. "$TARGET_PATH"/
fi

if [[ "$SKIP_MAINT" -eq 0 ]]; then
  cp "$MAINT_PATH" "$TARGET_PATH/index.html"
fi

step "Clear maintenance — go live"
cp "$DIST_PATH/index.html" "$TARGET_PATH/index.html"
if [[ -f "$DIST_PATH/404.html" ]]; then
  cp "$DIST_PATH/404.html" "$TARGET_PATH/404.html"
else
  cp "$DIST_PATH/index.html" "$TARGET_PATH/404.html"
fi
rm -f "$TARGET_PATH/.maintenance"
trap - ERR

echo
echo "Deploy complete."
