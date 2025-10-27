#!/bin/bash
# Comprehensive Test Suite for Veris MVP

set +e  # Don't exit on errors

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          Veris MVP - Comprehensive Test Suite                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

TESTS_PASSED=0
TESTS_FAILED=0

test_result() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC}"
    ((TESTS_FAILED++))
  fi
}

# Test 1: File Structure
echo -e "${BLUE}Test 1: File Structure${NC}"
echo "  Checking core files..."
[ -f "docs/mvp.md" ] && [ -f "Makefile" ] && [ -f "frontend/package.json" ]
test_result

# Test 2: Ed25519 Module
echo -e "${BLUE}Test 2: Ed25519 Cryptographic Module${NC}"
echo "  Checking ed25519-crypto.ts..."
[ -f "frontend/src/lib/ed25519-crypto.ts" ]
test_result

# Test 3: Proof Schema
echo -e "${BLUE}Test 3: Canonical Proof Schema${NC}"
echo "  Checking proof.schema.json..."
[ -f "frontend/src/schema/proof.schema.json" ]
test_result

# Test 4: API Endpoints
echo -e "${BLUE}Test 4: API Endpoints${NC}"
echo "  Checking proof create and verify endpoints..."
[ -f "frontend/src/app/api/proof/create/route.ts" ] && [ -f "frontend/src/app/api/verify/route.ts" ]
test_result

# Test 5: CI/CD Workflows
echo -e "${BLUE}Test 5: GitHub Actions Workflows${NC}"
echo "  Checking CI/CD workflows..."
[ -f ".github/workflows/content_guard.yml" ] && [ -f ".github/workflows/e2e.yml" ] && [ -f ".github/workflows/web_quality.yml" ] && [ -f ".github/workflows/release_gate.yml" ]
test_result

# Test 6: Ed25519 Integration
echo -e "${BLUE}Test 6: Ed25519 Integration Test${NC}"
echo "  Running Ed25519 tests..."
cd frontend && VERIS_ED25519_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEILnGr7/NvL3+ya0BadqTsQ0wX/aVNQlAErAmKPT54FtA
-----END PRIVATE KEY-----" VERIS_ED25519_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEANm/YgjaVX2nQ4jdtTDYBpJufTILtCMfRku/I4itlMLs=
-----END PUBLIC KEY-----" VERIS_ISSUER="did:web:veris.example" npx tsx scripts/test-ed25519-integration.ts > /tmp/ed25519-test.log 2>&1
test_result

# Test 7: TypeScript Compilation
echo -e "${BLUE}Test 7: TypeScript Compilation${NC}"
echo "  Checking TypeScript compilation..."
cd frontend && npx tsc --noEmit --skipLibCheck 2>&1 | grep -q "error TS" || true
[ $? -ne 0 ]
test_result

# Test 8: Package Dependencies
echo -e "${BLUE}Test 8: Package Dependencies${NC}"
echo "  Checking dependencies..."
cd frontend && [ -f "node_modules/.package-lock.json" ] || [ -f "pnpm-lock.yaml" ]
test_result

# Test 9: External Services Configuration
echo -e "${BLUE}Test 9: External Services Configuration${NC}"
echo "  Checking environment configuration..."
[ -f "frontend/.env.local" ]
test_result

# Test 10: Makefile Targets
echo -e "${BLUE}Test 10: Makefile MVP Targets${NC}"
echo "  Checking Makefile..."
grep -q "bootstrap:" Makefile && grep -q "test:" Makefile
test_result

# Summary
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    Test Results                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed${NC}"
  exit 1
fi
