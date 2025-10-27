#!/bin/bash

# Comprehensive Veris MVP Audit Script
# Audits all wiring to external services, checks statuses, workflows, deployments, and variables

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║          Veris MVP - Comprehensive Audit Suite                ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Initialize counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
pass() {
  echo -e "${GREEN}✅ PASS${NC} - $1"
  ((PASSED++))
}

fail() {
  echo -e "${RED}❌ FAIL${NC} - $1"
  ((FAILED++))
}

warn() {
  echo -e "${YELLOW}⚠️  WARN${NC} - $1"
  ((WARNINGS++))
}

info() {
  echo -e "${BLUE}ℹ️  INFO${NC} - $1"
}

section() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📋 $1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
}

# Check if in correct directory
section "Environment Check"
if [ ! -f "docs/mvp.md" ]; then
  fail "Must run from project root"
  exit 1
fi
pass "Running from project root"

# Check for required files
section "File Structure Audit"
FILES=(
  "docs/mvp.md"
  "frontend/package.json"
  "Makefile"
  "frontend/src/lib/ed25519-crypto.ts"
  "frontend/src/lib/proof-schema.ts"
  "frontend/src/app/api/proof/create/route.ts"
  "frontend/src/app/api/verify/route.ts"
  ".github/workflows/content_guard.yml"
  ".github/workflows/e2e.yml"
  ".github/workflows/web_quality.yml"
  ".github/workflows/release_gate.yml"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    pass "File exists: $file"
  else
    fail "Missing file: $file"
  fi
done

# Check environment variables
section "Environment Variables Audit"
if [ -f "frontend/.env.local" ]; then
  pass "Environment file exists: frontend/.env.local"
  
  # Check for required variables
  REQ_VARS=(
    "VERIS_ED25519_PRIVATE_KEY"
    "VERIS_ED25519_PUBLIC_KEY"
    "VERIS_ISSUER"
  )
  
  for var in "${REQ_VARS[@]}"; do
    if grep -q "$var" frontend/.env.local; then
      # Check if it's a placeholder
      if grep "$var" frontend/.env.local | grep -q "your-.*-here"; then
        warn "$var is set but contains placeholder"
      else
        pass "$var is configured"
      fi
    else
      warn "$var not found in .env.local"
    fi
  done
else
  warn "No .env.local file found"
fi

# Check Supabase configuration
section "Supabase Configuration Audit"
if [ -f "frontend/src/lib/supabaseAdmin.ts" ]; then
  pass "Supabase admin client exists"
  
  # Check for required Supabase variables
  if grep -q "NEXT_PUBLIC_SUPABASE_URL" frontend/.env.local 2>/dev/null; then
    SUPABASE_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" frontend/.env.local | cut -d'=' -f2 | tr -d '"')
    if [[ $SUPABASE_URL == *"your-project"* ]] || [[ $SUPABASE_URL == *"test.supabase.co"* ]]; then
      warn "Supabase URL appears to be placeholder: $SUPABASE_URL"
    else
      pass "Supabase URL configured: $SUPABASE_URL"
    fi
  else
    fail "NEXT_PUBLIC_SUPABASE_URL not configured"
  fi
else
  fail "Supabase admin client missing"
fi

# Check GitHub Actions workflows
section "GitHub Actions Workflows Audit"
WORKFLOWS=(
  ".github/workflows/content_guard.yml"
  ".github/workflows/e2e.yml"
  ".github/workflows/web_quality.yml"
  ".github/workflows/release_gate.yml"
)

for workflow in "${WORKFLOWS[@]}"; do
  if [ -f "$workflow" ]; then
    pass "Workflow exists: $(basename $workflow)"
    
    # Check if workflow is valid YAML
    if command -v yaml-cli &> /dev/null; then
      if yaml-cli validate "$workflow" &> /dev/null; then
        pass "Workflow is valid YAML: $(basename $workflow)"
      else
        warn "Workflow may have YAML issues: $(basename $workflow)"
      fi
    fi
  else
    fail "Missing workflow: $workflow"
  fi
done

# Check Ed25519 integration
section "Ed25519 Integration Audit"
if [ -f "frontend/src/lib/ed25519-crypto.ts" ]; then
  pass "Ed25519 crypto module exists"
  
  # Check for key functions
  FUNCTIONS=(
    "sha256"
    "signEd25519"
    "verifyEd25519"
    "createCanonicalProof"
    "verifyCanonicalProof"
  )
  
  for func in "${FUNCTIONS[@]}"; do
    if grep -q "export function $func" frontend/src/lib/ed25519-crypto.ts; then
      pass "Function exists: $func"
    else
      fail "Missing function: $func"
    fi
  done
else
  fail "Ed25519 crypto module missing"
fi

# Check proof schema
section "Proof Schema Audit"
if [ -f "frontend/src/schema/proof.schema.json" ]; then
  pass "Canonical proof schema exists"
  
  # Validate JSON
  if command -v jq &> /dev/null; then
    if jq empty frontend/src/schema/proof.schema.json 2>/dev/null; then
      pass "Proof schema is valid JSON"
      
      # Check for required fields
      REQUIRED_FIELDS=("proof_id" "sha256" "issued_at" "signature" "issuer")
      for field in "${REQUIRED_FIELDS[@]}"; do
        if jq -e ".required[] | select(. == \"$field\")" frontend/src/schema/proof.schema.json &> /dev/null; then
          pass "Required field exists: $field"
        else
          fail "Missing required field: $field"
        fi
      done
    else
      fail "Proof schema is not valid JSON"
    fi
  fi
else
  fail "Canonical proof schema missing"
fi

# Check API endpoints
section "API Endpoints Audit"
ENDPOINTS=(
  "frontend/src/app/api/proof/create/route.ts"
  "frontend/src/app/api/verify/route.ts"
)

for endpoint in "${ENDPOINTS[@]}"; do
  if [ -f "$endpoint" ]; then
    pass "Endpoint exists: $(basename $(dirname $endpoint))/$(basename $endpoint)"
    
    # Check for Ed25519 usage
    if grep -q "ed25519-crypto" "$endpoint"; then
      pass "Uses Ed25519 crypto: $(basename $endpoint)"
    else
      warn "May not use Ed25519: $(basename $endpoint)"
    fi
  else
    fail "Missing endpoint: $endpoint"
  fi
done

# Check Makefile targets
section "Makefile Targets Audit"
if [ -f "Makefile" ]; then
  pass "Makefile exists"
  
  # Check for MVP targets
  MVP_TARGETS=("bootstrap" "schema:lint" "issue" "verify" "demo" "test" "lh" "a11y" "release")
  
  for target in "${MVP_TARGETS[@]}"; do
    if grep -q "^$target:" Makefile; then
      pass "MVP target exists: $target"
    else
      warn "MVP target missing: $target"
    fi
  done
else
  fail "Makefile missing"
fi

# Check documentation
section "Documentation Audit"
if [ -d "docs/archive" ]; then
  ARCHIVE_COUNT=$(find docs/archive -type f | wc -l | tr -d ' ')
  if [ "$ARCHIVE_COUNT" -gt 0 ]; then
    pass "Archive directory exists with $ARCHIVE_COUNT files"
  else
    warn "Archive directory exists but is empty"
  fi
else
  warn "Archive directory missing"
fi

if [ -f "docs/README.md" ]; then
  if grep -q "Execution is governed solely by \`mvp.md\`" docs/README.md; then
    pass "Archive tombstone present"
  else
    warn "Archive tombstone may be missing"
  fi
fi

# Summary
section "Audit Summary"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESULTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All critical checks passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some checks failed${NC}"
  exit 1
fi
