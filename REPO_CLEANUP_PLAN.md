# Repo Size Issue - 2.4GB

## Problem

- **Local size**: 2.4GB
- **Git repo size**: 57MB (good!)
- **Issue**: `AWSCLIV2.pkg` (48MB) was committed to git history

## Root Cause

The large AWS CLI installer was accidentally committed to the repo at some point.

## Solution

### Option 1: Simple (Recommended)

Just remove the file from current commit and let it stay in history:

```bash
git rm AWSCLIV2.pkg
git commit -m "chore: remove AWSCLIV2.pkg"
```

### Option 2: Complete (Harder)

Use git-filter-repo to remove from entire history:

```bash
pip install git-filter-repo
git filter-repo --path AWSCLIV2.pkg --invert-paths --force
git push --force
```

## Local Files (OK to ignore)

- `node_modules` (1.1GB) - already ignored ✓
- `frontend/.next` (caches) - already ignored ✓
- `frontend/coverage` (14MB) - already ignored ✓

## Recommendation

**The repo itself is fine (57MB)**. The 2.4GB is just local development files.

**Action**: Clean up the remaining staged deletions and commit. The AWSCLIV2.pkg deletion is already staged.
