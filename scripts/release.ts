#!/usr/bin/env tsx

/**
 * Release Script for Veris Platform
 * 
 * This script automates the release process by:
 * 1. Bumping the version in package.json files
 * 2. Creating a git tag
 * 3. Generating a CHANGELOG from commits since last release
 * 
 * Usage:
 *   pnpm run release [patch|minor|major]
 *   or
 *   tsx scripts/release.ts [patch|minor|major]
 * 
 * Examples:
 *   pnpm run release patch    # 0.1.0 -> 0.1.1
 *   pnpm run release minor    # 0.1.0 -> 0.2.0
 *   pnpm run release major    # 0.1.0 -> 1.0.0
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import path from "path";

interface PackageJson {
  name: string;
  version: string;
  [key: string]: any;
}

interface Commit {
  hash: string;
  message: string;
  type: string;
  scope?: string;
  description: string;
  breaking: boolean;
}

type VersionBump = "patch" | "minor" | "major";

const VERSION_BUMP_ORDER: Record<VersionBump, number> = {
  patch: 2,
  minor: 1,
  major: 0,
};

const COMMIT_TYPES = {
  feat: "Features",
  fix: "Bug Fixes",
  docs: "Documentation",
  style: "Styles",
  refactor: "Code Refactoring",
  perf: "Performance Improvements",
  test: "Tests",
  build: "Build System",
  ci: "Continuous Integration",
  chore: "Chores",
  revert: "Reverts",
};

function parseVersion(version: string): [number, number, number] {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid version format: ${version}`);
  }
  return [parts[0], parts[1], parts[2]];
}

function bumpVersion(version: string, bumpType: VersionBump): string {
  const [major, minor, patch] = parseVersion(version);
  
  switch (bumpType) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Invalid bump type: ${bumpType}`);
  }
}

function getCommitsSinceLastTag(): Commit[] {
  try {
    // Get the last tag
    const lastTag = execSync("git describe --tags --abbrev=0", { encoding: "utf8" }).trim();
    console.log(`📋 Getting commits since last tag: ${lastTag}`);
    
    // Get commits since last tag
    const gitLog = execSync(
      `git log ${lastTag}..HEAD --pretty=format:"%H|%s" --no-merges`,
      { encoding: "utf8" }
    );
    
    if (!gitLog.trim()) {
      console.log("ℹ️  No new commits since last tag");
      return [];
    }
    
    return gitLog
      .trim()
      .split("\n")
      .map(line => {
        const [hash, message] = line.split("|", 2);
        return parseCommitMessage(hash, message);
      });
  } catch (error) {
    // If no tags exist, get all commits
    console.log("📋 Getting all commits (no previous tags found)");
    const gitLog = execSync(
      "git log --pretty=format:\"%H|%s\" --no-merges",
      { encoding: "utf8" }
    );
    
    return gitLog
      .trim()
      .split("\n")
      .map(line => {
        const [hash, message] = line.split("|", 2);
        return parseCommitMessage(hash, message);
      });
  }
}

function parseCommitMessage(hash: string, message: string): Commit {
  // Parse conventional commit format: type(scope): description
  const conventionalMatch = message.match(/^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/);
  
  if (conventionalMatch) {
    const [, type, scope, breaking, description] = conventionalMatch;
    return {
      hash: hash.substring(0, 7),
      message,
      type: type.toLowerCase(),
      scope,
      description,
      breaking: !!breaking,
    };
  }
  
  // Fallback for non-conventional commits
  return {
    hash: hash.substring(0, 7),
    message,
    type: "other",
    description: message,
    breaking: false,
  };
}

function generateChangelog(commits: Commit[], newVersion: string): string {
  if (commits.length === 0) {
    return `## [${newVersion}] - ${new Date().toISOString().split('T')[0]}\n\nNo changes.`;
  }
  
  const groupedCommits = commits.reduce((groups, commit) => {
    const type = COMMIT_TYPES[commit.type as keyof typeof COMMIT_TYPES] || "Other Changes";
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(commit);
    return groups;
  }, {} as Record<string, Commit[]>);
  
  let changelog = `## [${newVersion}] - ${new Date().toISOString().split('T')[0]}\n\n`;
  
  // Add breaking changes first
  const breakingChanges = commits.filter(c => c.breaking);
  if (breakingChanges.length > 0) {
    changelog += "### ⚠️ Breaking Changes\n\n";
    breakingChanges.forEach(commit => {
      changelog += `- ${commit.description} (${commit.hash})\n`;
    });
    changelog += "\n";
  }
  
  // Add other changes grouped by type
  Object.entries(groupedCommits)
    .filter(([type]) => type !== "Other Changes")
    .forEach(([type, typeCommits]) => {
      changelog += `### ${type}\n\n`;
      typeCommits.forEach(commit => {
        const scope = commit.scope ? `**${commit.scope}**: ` : "";
        changelog += `- ${scope}${commit.description} (${commit.hash})\n`;
      });
      changelog += "\n";
    });
  
  // Add other changes
  if (groupedCommits["Other Changes"]) {
    changelog += `### Other Changes\n\n`;
    groupedCommits["Other Changes"].forEach(commit => {
      changelog += `- ${commit.description} (${commit.hash})\n`;
    });
    changelog += "\n";
  }
  
  return changelog.trim();
}

function updatePackageJson(filePath: string, newVersion: string): void {
  const packageJson: PackageJson = JSON.parse(readFileSync(filePath, "utf8"));
  const oldVersion = packageJson.version;
  packageJson.version = newVersion;
  
  writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + "\n");
  console.log(`📦 Updated ${path.basename(filePath)}: ${oldVersion} → ${newVersion}`);
}

function updateChangelog(changelogEntry: string): void {
  const changelogPath = path.join(__dirname, "../docs/CHANGELOG.md");
  
  let existingChangelog = "";
  try {
    existingChangelog = readFileSync(changelogPath, "utf8");
  } catch (error) {
    // Create new changelog if it doesn't exist
    existingChangelog = "# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n";
  }
  
  // Insert new changelog entry after the header
  const headerMatch = existingChangelog.match(/^(# Changelog\n\n[^#]*)/);
  if (headerMatch) {
    const header = headerMatch[1];
    const rest = existingChangelog.substring(headerMatch[0].length);
    const newChangelog = header + changelogEntry + "\n\n" + rest;
    writeFileSync(changelogPath, newChangelog);
  } else {
    writeFileSync(changelogPath, existingChangelog + "\n" + changelogEntry + "\n");
  }
  
  console.log("📝 Updated CHANGELOG.md");
}

async function main() {
  const bumpType = (process.argv[2] as VersionBump) || "patch";
  
  if (!["patch", "minor", "major"].includes(bumpType)) {
    console.error("❌ Invalid bump type. Use: patch, minor, or major");
    process.exit(1);
  }
  
  console.log(`🚀 Starting release process with ${bumpType} version bump...`);
  
  try {
    // Check if working directory is clean
    const gitStatus = execSync("git status --porcelain", { encoding: "utf8" });
    if (gitStatus.trim()) {
      console.error("❌ Working directory is not clean. Please commit or stash changes first.");
      console.error("Uncommitted changes:");
      console.error(gitStatus);
      process.exit(1);
    }
    
    // Get current version
    const rootPackageJson: PackageJson = JSON.parse(
      readFileSync(path.join(__dirname, "../package.json"), "utf8")
    );
    const currentVersion = rootPackageJson.version;
    const newVersion = bumpVersion(currentVersion, bumpType);
    
    console.log(`📈 Version bump: ${currentVersion} → ${newVersion}`);
    
    // Get commits since last tag
    const commits = getCommitsSinceLastTag();
    console.log(`📋 Found ${commits.length} commits since last release`);
    
    // Generate changelog
    const changelogEntry = generateChangelog(commits, newVersion);
    
    // Update package.json files
    updatePackageJson(path.join(__dirname, "../package.json"), newVersion);
    updatePackageJson(path.join(__dirname, "../frontend/package.json"), newVersion);
    
    // Update changelog
    updateChangelog(changelogEntry);
    
    // Stage changes
    execSync("git add package.json frontend/package.json docs/CHANGELOG.md");
    
    // Create commit
    execSync(`git commit -m "chore: release v${newVersion}"`);
    
    // Create tag
    execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`);
    
    console.log(`\n✅ Release v${newVersion} created successfully!`);
    console.log("\n📋 Next steps:");
    console.log("1. Review the changes:");
    console.log("   git show HEAD");
    console.log("2. Push the release:");
    console.log("   git push origin main");
    console.log("   git push origin v" + newVersion);
    console.log("3. Create a GitHub release if needed");
    
  } catch (error) {
    console.error("❌ Release failed:", error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  });
}
