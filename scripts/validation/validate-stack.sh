#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

REP_PORT="${OS_MOCK_REP_PORT:-4482}"
LOCAL_PORT="${OS_MOCK_LOCAL_PORT:-4483}"

mkdir -p logs

echo "==> Building packages"
npm run build

echo "==> Type checking"
npm run typecheck

echo "==> Running Vitest suite"
npm test

echo "==> Running representative QA on port ${REP_PORT}"
OS_MOCK_PORT="${REP_PORT}" npm run qa:representative

echo "==> Running local-input QA on port ${LOCAL_PORT}"
OS_MOCK_PORT="${LOCAL_PORT}" npm run qa:local-input
