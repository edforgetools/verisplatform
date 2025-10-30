#!/usr/bin/env tsx
/**
 * Dead Code Detection Script
 *
 * Uses knip and ts-prune to detect unused code
 * Generates comprehensive report with actionable recommendations
 *
 * Usage: npx tsx scripts/dead_code.ts
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface DeadCodeReport {
  timestamp: string;
  summary: {
    unusedFiles: number;
    unusedExports: number;
    unusedDependencies: number;
    totalIssues: number;
  };
  knipResults: any;
  tsPruneResults: string;
  recommendations: string[];
}

function runCommand(command: string, cwd: string): string {
  try {
    return execSync(command, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (error: any) {
    // Many tools exit with code 1 when they find issues
    return error.stdout || error.stderr || '';
  }
}

function parseKnipOutput(output: string): any {
  try {
    // Knip outputs JSON when --reporter json is used
    return JSON.parse(output);
  } catch {
    // Fallback to text parsing
    return {
      files: [],
      dependencies: [],
      exports: [],
      raw: output,
    };
  }
}

function parseTsPruneOutput(output: string): {
  unusedExports: string[];
  count: number;
} {
  const lines = output
    .split('\n')
    .filter((line) => line.trim() && !line.includes('used in module'));

  return {
    unusedExports: lines,
    count: lines.length,
  };
}

async function runKnip(cwd: string): Promise<any> {
  console.log('🔍 Running knip...');

  const output = runCommand('npx knip --reporter json', cwd);
  const results = parseKnipOutput(output);

  console.log(
    `   Found ${results.files?.length || 0} unused files, ${results.exports?.length || 0} unused exports, ${results.dependencies?.length || 0} unused dependencies`
  );

  return results;
}

async function runTsPrune(cwd: string): Promise<string> {
  console.log('🔍 Running ts-prune...');

  const output = runCommand('npx ts-prune --error', cwd);

  const parsed = parseTsPruneOutput(output);
  console.log(`   Found ${parsed.count} unused exports`);

  return output;
}

async function generateRecommendations(
  knipResults: any,
  tsPruneResults: string
): Promise<string[]> {
  const recommendations: string[] = [];

  // Unused dependencies
  if (knipResults.dependencies && knipResults.dependencies.length > 0) {
    recommendations.push(
      `Remove ${knipResults.dependencies.length} unused dependencies:`
    );
    knipResults.dependencies.slice(0, 5).forEach((dep: string) => {
      recommendations.push(`  - pnpm remove ${dep}`);
    });
    if (knipResults.dependencies.length > 5) {
      recommendations.push(
        `  - ... and ${knipResults.dependencies.length - 5} more`
      );
    }
  }

  // Unused files
  if (knipResults.files && knipResults.files.length > 0) {
    recommendations.push(`Delete ${knipResults.files.length} unused files:`);
    knipResults.files.slice(0, 5).forEach((file: string) => {
      recommendations.push(`  - rm ${file}`);
    });
    if (knipResults.files.length > 5) {
      recommendations.push(`  - ... and ${knipResults.files.length - 5} more`);
    }
  }

  // Unused exports
  const tsPruneLines = tsPruneResults.split('\n').filter((l) => l.trim());
  if (tsPruneLines.length > 0) {
    recommendations.push('Remove or refactor unused exports:');
    tsPruneLines.slice(0, 5).forEach((line) => {
      recommendations.push(`  - ${line}`);
    });
    if (tsPruneLines.length > 5) {
      recommendations.push(`  - ... and ${tsPruneLines.length - 5} more`);
    }
  }

  // General recommendations
  if (recommendations.length > 0) {
    recommendations.push('');
    recommendations.push('General best practices:');
    recommendations.push('- Review and remove code carefully');
    recommendations.push('- Run tests after each removal');
    recommendations.push('- Commit frequently to enable easy rollback');
    recommendations.push('- Use git grep to check for dynamic imports');
  } else {
    recommendations.push('✅ No dead code detected!');
    recommendations.push('Continue maintaining clean code practices.');
  }

  return recommendations;
}

async function generateMarkdownReport(report: DeadCodeReport) {
  const md = `# Dead Code Detection Report

**Generated:** ${new Date(report.timestamp).toLocaleString()}

## Summary

- **Unused Files:** ${report.summary.unusedFiles}
- **Unused Exports:** ${report.summary.unusedExports}
- **Unused Dependencies:** ${report.summary.unusedDependencies}
- **Total Issues:** ${report.summary.totalIssues}

## Status

${
  report.summary.totalIssues === 0
    ? '✅ **No dead code detected!** Your codebase is clean.'
    : `⚠️  **${report.summary.totalIssues} issues found.** Review and clean up dead code.`
}

## Knip Results

${
  report.knipResults.files && report.knipResults.files.length > 0
    ? `
### Unused Files (${report.knipResults.files.length})

\`\`\`
${report.knipResults.files.join('\n')}
\`\`\`
`
    : '✅ No unused files detected.'
}

${
  report.knipResults.dependencies && report.knipResults.dependencies.length > 0
    ? `
### Unused Dependencies (${report.knipResults.dependencies.length})

\`\`\`
${report.knipResults.dependencies.join('\n')}
\`\`\`
`
    : '✅ No unused dependencies detected.'
}

${
  report.knipResults.exports && report.knipResults.exports.length > 0
    ? `
### Unused Exports (${report.knipResults.exports.length})

\`\`\`
${report.knipResults.exports.slice(0, 20).join('\n')}
${report.knipResults.exports.length > 20 ? `\n... and ${report.knipResults.exports.length - 20} more` : ''}
\`\`\`
`
    : '✅ No unused exports detected by knip.'
}

## ts-prune Results

${
  report.tsPruneResults.trim()
    ? `
\`\`\`
${report.tsPruneResults.split('\n').slice(0, 20).join('\n')}
${report.tsPruneResults.split('\n').length > 20 ? `\n... and ${report.tsPruneResults.split('\n').length - 20} more lines` : ''}
\`\`\`
`
    : '✅ No unused exports detected by ts-prune.'
}

## Recommendations

${report.recommendations.map((r) => r).join('\n')}

## How to Use This Report

1. **Review carefully:** Not all "unused" code is safe to remove
   - Check for dynamic imports (\`import()\`)
   - Verify exports used by external packages
   - Consider public API surfaces

2. **Start with dependencies:** Safest to remove first
   \`\`\`bash
   pnpm remove <package-name>
   pnpm test
   \`\`\`

3. **Then remove files:** Check git history first
   \`\`\`bash
   git log --follow <file-path>
   rm <file-path>
   pnpm test
   \`\`\`

4. **Finally refactor exports:** Most time-consuming
   - Convert to internal helper functions
   - Remove from public API
   - Update documentation

5. **Test thoroughly:**
   \`\`\`bash
   pnpm typecheck
   pnpm lint
   pnpm test
   pnpm test:e2e
   pnpm build
   \`\`\`

## Tools Used

- **knip:** Detects unused files, exports, and dependencies
  - [Documentation](https://github.com/webpro/knip)
  - Configuration: \`knip.config.js\` or \`package.json\`

- **ts-prune:** TypeScript-focused unused export detection
  - [Documentation](https://github.com/nadeesha/ts-prune)
  - More conservative than knip

## Next Steps

1. Review this report and prioritize removals
2. Create tasks for large cleanup efforts
3. Remove unused code incrementally
4. Run \`make audit:dead\` weekly to prevent accumulation

## Scheduled Re-audit

**Next scan:** ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}

## References

- [Dead Code Elimination Best Practices](https://kentcdodds.com/blog/eliminate-an-entire-category-of-bugs-with-a-few-simple-tools)
- [Tree Shaking Guide](https://webpack.js.org/guides/tree-shaking/)
- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)
`;

  const outputPath = join(process.cwd(), 'docs', 'audits', 'dead-code.md');
  writeFileSync(outputPath, md, 'utf-8');
  console.log(`\n✅ Markdown report written to: ${outputPath}`);
}

async function writeJsonReport(report: DeadCodeReport) {
  const outputPath = join(process.cwd(), 'docs', 'audits', 'dead-code.json');
  writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`✅ JSON report written to: ${outputPath}`);
}

async function main() {
  try {
    console.log('🔍 Dead Code Detection\n');

    const cwd = join(process.cwd(), 'frontend');

    // Run tools
    const knipResults = await runKnip(cwd);
    const tsPruneResults = await runTsPrune(cwd);

    // Parse results
    const tsPruneParsed = parseTsPruneOutput(tsPruneResults);

    const summary = {
      unusedFiles: knipResults.files?.length || 0,
      unusedExports:
        (knipResults.exports?.length || 0) + tsPruneParsed.count,
      unusedDependencies: knipResults.dependencies?.length || 0,
      totalIssues: 0,
    };

    summary.totalIssues =
      summary.unusedFiles + summary.unusedExports + summary.unusedDependencies;

    // Generate recommendations
    const recommendations = await generateRecommendations(
      knipResults,
      tsPruneResults
    );

    const report: DeadCodeReport = {
      timestamp: new Date().toISOString(),
      summary,
      knipResults,
      tsPruneResults,
      recommendations,
    };

    // Print summary
    console.log('\n📊 Summary:');
    console.log(`   Unused Files: ${summary.unusedFiles}`);
    console.log(`   Unused Exports: ${summary.unusedExports}`);
    console.log(`   Unused Dependencies: ${summary.unusedDependencies}`);
    console.log(`   Total Issues: ${summary.totalIssues}`);

    // Write reports
    await generateMarkdownReport(report);
    await writeJsonReport(report);

    // Exit with error if issues found
    if (summary.totalIssues > 0) {
      console.error(
        `\n⚠️  ${summary.totalIssues} dead code issues found. Review docs/audits/dead-code.md`
      );
      process.exit(1);
    } else {
      console.log('\n✅ No dead code detected!');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Dead code detection failed:', error);
    process.exit(1);
  }
}

main();
