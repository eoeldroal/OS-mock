#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

PORT="${OS_MOCK_BROWSER_HELP_PORT:-4521}"
SEED="${OS_MOCK_BROWSER_HELP_SEED:-0}"
MAX_STEPS="${OS_MOCK_BROWSER_HELP_MAX_STEPS:-64}"
TASK_ID="${OS_MOCK_BROWSER_HELP_TASK_ID:-browser_help_preopen_note_distractors}"
ACTIONS_FILE="${OS_MOCK_BROWSER_HELP_ACTIONS:-scripts/manual/solver/browser-help-sequence.json}"
STAMP="$(date +"%Y-%m-%dT%H-%M-%S")"
OUT_DIR="${OS_MOCK_BROWSER_HELP_OUT_DIR:-$ROOT_DIR/output/validation/browser-help-visual/$STAMP}"

if [[ "${OS_MOCK_BROWSER_HELP_SKIP_BUILD:-0}" != "1" ]]; then
  echo "==> Building packages"
  npm run build
fi

echo "==> Running browser-help visual validation"
node scripts/manual/solver/run-solver-sequence.mjs \
  --task "$TASK_ID" \
  --seed "$SEED" \
  --max-steps "$MAX_STEPS" \
  --port "$PORT" \
  --actions "$ACTIONS_FILE" \
  --out-dir "$OUT_DIR"

echo
echo "Artifacts written to:"
echo "  $OUT_DIR"
echo
echo "Inspect:"
echo "  $OUT_DIR/README.md"
echo "  $OUT_DIR/summary.json"
echo "  $OUT_DIR/manifest.json"
