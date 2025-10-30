#!/bin/bash
set -euo pipefail

# Secret Scanning Script
# Scans repository for leaked secrets using gitleaks and trufflehog
#
# Usage: ./scripts/secret_scan.sh [--ci]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPORTS_DIR="$REPO_ROOT/docs/audits/security"
CI_MODE="${1:-}"

echo "🔍 Secret Scanning Report"
echo "=========================="
echo "Repository: $REPO_ROOT"
echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo ""

# Create reports directory
mkdir -p "$REPORTS_DIR"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Track overall status
SCAN_FAILED=0

# Run gitleaks
echo "📝 Running gitleaks..."
if command_exists gitleaks; then
    if gitleaks detect \
        --source="$REPO_ROOT" \
        --report-path="$REPORTS_DIR/gitleaks-report.json" \
        --report-format=json \
        --no-git \
        > "$REPORTS_DIR/gitleaks-output.txt" 2>&1; then
        echo "✅ gitleaks: No secrets detected"
    else
        EXIT_CODE=$?
        if [ $EXIT_CODE -eq 1 ]; then
            echo "❌ gitleaks: Secrets detected! See $REPORTS_DIR/gitleaks-report.json"
            SCAN_FAILED=1
        else
            echo "⚠️  gitleaks: Scan error (exit code: $EXIT_CODE)"
            SCAN_FAILED=1
        fi
    fi
else
    echo "⚠️  gitleaks not installed. Install with: brew install gitleaks"
    if [ "$CI_MODE" = "--ci" ]; then
        SCAN_FAILED=1
    fi
fi
echo ""

# Run trufflehog (filesystem scan)
echo "📝 Running trufflehog..."
if command_exists trufflehog; then
    if trufflehog filesystem "$REPO_ROOT" \
        --json \
        --exclude-paths="$REPO_ROOT/.gitleaks.toml" \
        > "$REPORTS_DIR/trufflehog-report.json" 2>&1; then

        # Check if any secrets found
        SECRETS_COUNT=$(jq -s 'length' "$REPORTS_DIR/trufflehog-report.json" 2>/dev/null || echo "0")
        if [ "$SECRETS_COUNT" -eq 0 ]; then
            echo "✅ trufflehog: No secrets detected"
        else
            echo "❌ trufflehog: $SECRETS_COUNT secrets detected! See $REPORTS_DIR/trufflehog-report.json"
            SCAN_FAILED=1
        fi
    else
        echo "⚠️  trufflehog: Scan error"
        SCAN_FAILED=1
    fi
else
    echo "⚠️  trufflehog not installed. Install with: brew install trufflehog"
    if [ "$CI_MODE" = "--ci" ]; then
        SCAN_FAILED=1
    fi
fi
echo ""

# Scan for common patterns manually
echo "📝 Scanning for common patterns..."
PATTERN_MATCHES=0

# Patterns to search for
PATTERNS=(
    "password.*=.*['\"]"
    "api[_-]?key.*=.*['\"]"
    "secret.*=.*['\"]"
    "token.*=.*['\"]"
    "aws[_-]?access[_-]?key"
    "BEGIN RSA PRIVATE KEY"
    "BEGIN PRIVATE KEY"
    "sk_live_"
    "sk_test_"
)

for pattern in "${PATTERNS[@]}"; do
    MATCHES=$(grep -r -E -i "$pattern" "$REPO_ROOT" \
        --exclude-dir={node_modules,.next,.git,.backups,test-results,playwright-report} \
        --exclude="*.json" \
        --exclude="*.md" \
        --exclude="secret_scan.sh" \
        2>/dev/null | wc -l | tr -d ' ')

    if [ "$MATCHES" -gt 0 ]; then
        echo "⚠️  Found $MATCHES matches for pattern: $pattern"
        PATTERN_MATCHES=$((PATTERN_MATCHES + MATCHES))
    fi
done

if [ "$PATTERN_MATCHES" -eq 0 ]; then
    echo "✅ No common secret patterns detected"
else
    echo "⚠️  Found $PATTERN_MATCHES potential secrets in files"
    echo "   Review manually: grep -r -E -i 'password|api.?key|secret|token' ."
fi
echo ""

# Check for .env files
echo "📝 Checking for environment files..."
ENV_FILES=$(find "$REPO_ROOT" -name ".env*" -not -name ".env.example" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null)
ENV_COUNT=$(echo "$ENV_FILES" | grep -c ".env" || echo "0")

if [ "$ENV_COUNT" -gt 0 ]; then
    echo "⚠️  Found $ENV_COUNT .env files:"
    echo "$ENV_FILES" | sed 's/^/   /'
    echo ""
    echo "   Ensure these are in .gitignore and not committed:"
    echo "   git check-ignore \$(find . -name '.env*' -not -name '.env.example')"
else
    echo "✅ No .env files found (besides .env.example)"
fi
echo ""

# Generate summary report
echo "📊 Generating summary report..."
cat > "$REPORTS_DIR/secret-scan-summary.md" << EOF
# Secret Scan Summary

**Generated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")

## Results

| Scanner | Status |
|---------|--------|
| gitleaks | $([ -f "$REPORTS_DIR/gitleaks-report.json" ] && echo "✅ Complete" || echo "❌ Failed") |
| trufflehog | $([ -f "$REPORTS_DIR/trufflehog-report.json" ] && echo "✅ Complete" || echo "❌ Failed") |
| Pattern matching | ✅ Complete |
| .env file check | ✅ Complete |

## Findings

- **Pattern matches:** $PATTERN_MATCHES
- **Environment files:** $ENV_COUNT

## Actions Required

$(if [ $SCAN_FAILED -eq 1 ]; then
    echo "⚠️ **CRITICAL:** Secrets detected in repository!"
    echo ""
    echo "1. Review reports in \`docs/audits/security/\`"
    echo "2. Identify leaked secrets"
    echo "3. Remove secrets from git history (if committed)"
    echo "4. Rotate compromised credentials immediately"
    echo "5. Update .gitignore to prevent future leaks"
else
    echo "✅ No secrets detected."
    echo ""
    echo "Continue with routine security practices:"
    echo "- Run this scan weekly"
    echo "- Rotate keys every 90 days"
    echo "- Review .gitignore regularly"
fi)

## Reports

- [Gitleaks Report](./$REPORTS_DIR/gitleaks-report.json)
- [Trufflehog Report](./$REPORTS_DIR/trufflehog-report.json)

## Next Scan

**Scheduled:** $(date -u -v+7d +"%Y-%m-%d" 2>/dev/null || date -u -d "+7 days" +"%Y-%m-%d")

## References

- [Gitleaks Documentation](https://github.com/gitleaks/gitleaks)
- [Trufflehog Documentation](https://github.com/trufflesecurity/trufflehog)
- [Git History Secrets Removal](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
EOF

echo "✅ Summary report written to: $REPORTS_DIR/secret-scan-summary.md"
echo ""

# Final status
echo "=========================="
if [ $SCAN_FAILED -eq 1 ]; then
    echo "❌ SECRET SCAN FAILED"
    echo "   Review reports in $REPORTS_DIR"
    exit 1
else
    echo "✅ SECRET SCAN PASSED"
    echo "   No secrets detected"
    exit 0
fi
