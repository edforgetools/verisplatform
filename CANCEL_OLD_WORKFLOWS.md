# Best Practice: Managing Multiple Workflow Runs

## Quick Answer
Yes, it's totally fine (and recommended) to cancel old workflows when you push new fixes!

## Why Cancel?
- ✅ Saves CI minutes/resources
- ✅ Reduces noise in workflow history
- ✅ Focuses attention on latest commit
- ✅ No technical downsides - latest code is what matters

## How GitHub Auto-Cancels
By default, GitHub auto-cancels older runs of the same workflow when:
- New commits are pushed to the same branch
- This is the default behavior (can be enabled in workflow config)

## Manual Cancellation
If auto-cancel doesn't happen, you can cancel manually:

\`\`\`bash
# List running workflows
gh run list --limit 10

# Cancel specific run
gh run cancel <run-id>

# Cancel all running workflows for a branch
gh run list --branch main --status in_progress --json databaseId --jq '.[].databaseId' | while read id; do
  gh run cancel $id
done
\`\`\`

## Our Current Status
- ✅ Only 1 e2e workflow running (18827716240)
- ✅ Older workflows auto-cancelled by GitHub
- ⏳ Waiting for E2E to complete

