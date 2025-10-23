#!/usr/bin/env bash
set -euo pipefail
base="${SMOKE_BASE_URL:-http://localhost:3000}"
curl -fsS "$base/api/db-health" | jq .
curl -fsS "$base/api/integrity-check" | jq .
echo "smoke ok"
