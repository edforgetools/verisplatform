#!/bin/bash

# =============================================================================
# Gitignore Visibility Checker
# =============================================================================
# This script helps you see what files are being ignored by git

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔍 Gitignore Visibility Checker${NC}"
echo ""

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Not in a git repository${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Current .gitignore files:${NC}"
find . -name ".gitignore" -type f | while read -r file; do
    echo "  📁 $file"
done
echo ""

echo -e "${BLUE}📋 All ignored files:${NC}"
git ls-files --others --ignored --exclude-standard | head -20
if [ $(git ls-files --others --ignored --exclude-standard | wc -l) -gt 20 ]; then
    echo "  ... and $(($(git ls-files --others --ignored --exclude-standard | wc -l) - 20)) more files"
fi
echo ""

echo -e "${BLUE}📋 Environment files status:${NC}"
if [ -f ".env.local" ]; then
    echo -e "  ✅ .env.local exists ($(wc -l < .env.local) lines)"
    echo -e "  🔒 Contains real credentials (not shown for security)"
else
    echo -e "  ❌ .env.local missing"
    echo -e "  💡 Run: ./update-credentials.sh to create it"
fi

if [ -f "credentials-template.env" ]; then
    echo -e "  ✅ credentials-template.env exists ($(wc -l < credentials-template.env) lines)"
else
    echo -e "  ❌ credentials-template.env missing"
fi
echo ""

echo -e "${BLUE}📋 Build artifacts status:${NC}"
if [ -d ".next" ]; then
    echo -e "  ✅ .next/ directory exists (Next.js build output)"
else
    echo -e "  ❌ .next/ directory missing (run: npm run build)"
fi

if [ -d "node_modules" ]; then
    echo -e "  ✅ node_modules/ directory exists ($(ls node_modules | wc -l) packages)"
else
    echo -e "  ❌ node_modules/ directory missing (run: npm install)"
fi
echo ""

echo -e "${BLUE}📋 Key files status:${NC}"
if [ -f "private_key_single_line.txt" ]; then
    echo -e "  ✅ private_key_single_line.txt exists"
else
    echo -e "  ❌ private_key_single_line.txt missing"
fi

if [ -f "public_key_single_line.txt" ]; then
    echo -e "  ✅ public_key_single_line.txt exists"
else
    echo -e "  ❌ public_key_single_line.txt missing"
fi
echo ""

echo -e "${BLUE}📋 Git status:${NC}"
git status --porcelain | head -10
if [ $(git status --porcelain | wc -l) -gt 10 ]; then
    echo "  ... and $(($(git status --porcelain | wc -l) - 10)) more changes"
fi
echo ""

echo -e "${YELLOW}💡 Useful commands:${NC}"
echo "  • View all ignored files: git ls-files --others --ignored --exclude-standard"
echo "  • Check specific file: git check-ignore -v <filename>"
echo "  • View .env.local: cat .env.local"
echo "  • Update environment: ./update-credentials.sh"
echo "  • Check git status: git status --ignored"
echo ""

echo -e "${GREEN}✅ Gitignore visibility check complete${NC}"
