#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

STAMP="$(date +"%Y-%m-%dT%H-%M-%S")"
ROOT_OUT_DIR="${OS_MOCK_TEXT_OVERLAP_OUT_DIR:-$ROOT_DIR/output/validation/text-overlap-visual/$STAMP}"
BROWSER_HELP_DIR="$ROOT_OUT_DIR/browser-help"
FILES_NARROW_DIR="$ROOT_OUT_DIR/files-narrow"

if [[ "${OS_MOCK_TEXT_OVERLAP_SKIP_BUILD:-0}" != "1" ]]; then
  echo "==> Building packages"
  npm run build
fi

echo "==> Capturing browser-help overlap scene"
OS_MOCK_BROWSER_HELP_SKIP_BUILD=1 \
OS_MOCK_BROWSER_HELP_OUT_DIR="$BROWSER_HELP_DIR" \
bash scripts/validation/validate-browser-help-visual.sh

echo
echo "==> Capturing Files narrow overlap scene"
node scripts/manual/solver/run-solver-sequence.mjs \
  --task "${OS_MOCK_FILES_NARROW_TASK_ID:-rename_note_in_explorer}" \
  --seed "${OS_MOCK_FILES_NARROW_SEED:-0}" \
  --max-steps "${OS_MOCK_FILES_NARROW_MAX_STEPS:-32}" \
  --port "${OS_MOCK_FILES_NARROW_PORT:-4522}" \
  --actions "${OS_MOCK_FILES_NARROW_ACTIONS:-scripts/manual/solver/files-narrow-overlap-sequence.json}" \
  --out-dir "$FILES_NARROW_DIR"

cat > "$ROOT_OUT_DIR/README.md" <<EOF
# Text Overlap Visual Validation

- Browser help scene: [browser-help/README.md](browser-help/README.md)
- Files narrow scene: [files-narrow/README.md](files-narrow/README.md)

Focus on:
- requested-line cards not colliding with surrounding help copy
- typed note text not clipping into gutter or chrome
- narrow Files filename column not colliding with Modified metadata
- sidebar labels staying legible in the active selection pill
EOF

echo
echo "Artifacts written to:"
echo "  $ROOT_OUT_DIR"
echo
echo "Inspect:"
echo "  $ROOT_OUT_DIR/README.md"
