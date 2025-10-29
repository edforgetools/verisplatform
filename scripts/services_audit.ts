#!/usr/bin/env tsx
/**
 * External Services Audit Script
 *
 * Audits AWS, Supabase, Stripe, and Arweave configurations
 * Generates inventory and compliance reports
 *
 * Usage: npx tsx scripts/services_audit.ts
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

interface ServiceConfig {
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'unknown';
  lastAudit: string;
  issues: string[];
  recommendations: string[];
}

interface AuditReport {
  timestamp: string;
  services: ServiceConfig[];
  summary: {
    total: number;
    active: number;
    issues: number;
    criticalIssues: number;
  };
}

async function auditAWS(): Promise<ServiceConfig[]> {
  const services: ServiceConfig[] = [];

  // Check AWS environment variables
  const awsRegion = process.env.AWS_REGION;
  const awsRoleArn = process.env.AWS_ROLE_ARN;
  const registryBucket = process.env.REGISTRY_S3_BUCKET;

  services.push({
    name: 'AWS IAM Role',
    type: 'aws-iam',
    status: awsRoleArn ? 'active' : 'inactive',
    lastAudit: new Date().toISOString(),
    issues: awsRoleArn ? [] : ['AWS_ROLE_ARN not configured'],
    recommendations: [
      'Verify IAM role has least-privilege permissions',
      'Enable MFA for console access',
      'Review IAM policy annually',
    ],
  });

  services.push({
    name: 'S3 Registry Bucket',
    type: 'aws-s3',
    status: registryBucket ? 'active' : 'inactive',
    lastAudit: new Date().toISOString(),
    issues: registryBucket
      ? []
      : ['REGISTRY_S3_BUCKET not configured'],
    recommendations: [
      'Enable versioning on all buckets',
      'Enable default encryption (AES-256 or KMS)',
      'Block public access',
      'Enable access logging',
      'Configure lifecycle policies',
      'Review bucket policies quarterly',
    ],
  });

  return services;
}

async function auditSupabase(): Promise<ServiceConfig[]> {
  const services: ServiceConfig[] = [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  services.push({
    name: 'Supabase Project',
    type: 'supabase',
    status:
      supabaseUrl && supabaseAnonKey && supabaseServiceKey
        ? 'active'
        : 'inactive',
    lastAudit: new Date().toISOString(),
    issues: [
      !supabaseUrl && 'NEXT_PUBLIC_SUPABASE_URL not configured',
      !supabaseAnonKey && 'NEXT_PUBLIC_SUPABASE_ANON_KEY not configured',
      !supabaseServiceKey && 'SUPABASE_SERVICE_ROLE_KEY not configured',
    ].filter(Boolean) as string[],
    recommendations: [
      'Enable Row Level Security (RLS) on all tables',
      'Review database grants and roles',
      'Enable audit logging',
      'Configure JWT expiration',
      'Review API rate limits',
      'Backup database weekly',
    ],
  });

  return services;
}

async function auditStripe(): Promise<ServiceConfig[]> {
  const services: ServiceConfig[] = [];

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeMode = process.env.NEXT_PUBLIC_STRIPE_MODE;

  services.push({
    name: 'Stripe Payment Processing',
    type: 'stripe',
    status: stripeSecretKey && stripeWebhookSecret ? 'active' : 'inactive',
    lastAudit: new Date().toISOString(),
    issues: [
      !stripeSecretKey && 'STRIPE_SECRET_KEY not configured',
      !stripeWebhookSecret && 'STRIPE_WEBHOOK_SECRET not configured',
      stripeMode === 'live' && 'WARNING: Stripe in LIVE mode',
    ].filter(Boolean) as string[],
    recommendations: [
      'Rotate API keys every 90 days',
      'Use restricted keys with minimal permissions',
      'Enable webhook signature verification',
      'Monitor webhook delivery failures',
      'Set up fraud detection rules',
      'Review failed payments weekly',
    ],
  });

  return services;
}

async function auditArweave(): Promise<ServiceConfig[]> {
  const services: ServiceConfig[] = [];

  const arweaveGateway = process.env.ARWEAVE_GATEWAY_URL;
  const arweaveWallet = process.env.ARWEAVE_WALLET_JSON;

  services.push({
    name: 'Arweave Permanent Storage',
    type: 'arweave',
    status: arweaveGateway && arweaveWallet ? 'active' : 'inactive',
    lastAudit: new Date().toISOString(),
    issues: [
      !arweaveGateway && 'ARWEAVE_GATEWAY_URL not configured',
      !arweaveWallet && 'ARWEAVE_WALLET_JSON not configured',
    ].filter(Boolean) as string[],
    recommendations: [
      'Keep wallet backup in secure location',
      'Monitor wallet balance monthly',
      'Verify transaction confirmations',
      'Test data retrieval quarterly',
      'Document data retention policy',
    ],
  });

  return services;
}

async function auditRedis(): Promise<ServiceConfig[]> {
  const services: ServiceConfig[] = [];

  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;
  const upstashRestUrl = process.env.UPSTASH_REDIS_REST_URL;

  services.push({
    name: 'Redis Cache/Rate Limiting',
    type: 'redis',
    status: redisUrl || upstashRestUrl ? 'active' : 'inactive',
    lastAudit: new Date().toISOString(),
    issues: [!redisUrl && !upstashRestUrl && 'No Redis URL configured'].filter(
      Boolean
    ) as string[],
    recommendations: [
      'Enable TLS for connections',
      'Configure maxmemory and eviction policy',
      'Monitor memory usage',
      'Set up replication for production',
      'Review connection limits',
    ],
  });

  return services;
}

async function auditSentry(): Promise<ServiceConfig[]> {
  const services: ServiceConfig[] = [];

  const sentryDsn = process.env.SENTRY_DSN;

  services.push({
    name: 'Sentry Error Tracking',
    type: 'sentry',
    status: sentryDsn ? 'active' : 'inactive',
    lastAudit: new Date().toISOString(),
    issues: [!sentryDsn && 'SENTRY_DSN not configured (optional)'].filter(
      Boolean
    ) as string[],
    recommendations: [
      'Configure error sampling rate',
      'Set up release tracking',
      'Enable performance monitoring',
      'Configure alert thresholds',
      'Review error trends weekly',
    ],
  });

  return services;
}

async function generateReport(): Promise<AuditReport> {
  console.log('🔍 Auditing external services...\n');

  const allServices: ServiceConfig[] = [
    ...(await auditAWS()),
    ...(await auditSupabase()),
    ...(await auditStripe()),
    ...(await auditArweave()),
    ...(await auditRedis()),
    ...(await auditSentry()),
  ];

  const summary = {
    total: allServices.length,
    active: allServices.filter((s) => s.status === 'active').length,
    issues: allServices.reduce((sum, s) => sum + s.issues.length, 0),
    criticalIssues: allServices.filter(
      (s) =>
        s.issues.some((i) => i.includes('not configured')) &&
        s.type !== 'sentry'
    ).length,
  };

  return {
    timestamp: new Date().toISOString(),
    services: allServices,
    summary,
  };
}

async function writeMarkdownReport(report: AuditReport) {
  const md = `# External Services Audit Report

**Generated:** ${new Date(report.timestamp).toLocaleString()}

## Summary

- **Total Services:** ${report.summary.total}
- **Active Services:** ${report.summary.active}
- **Total Issues:** ${report.summary.issues}
- **Critical Issues:** ${report.summary.criticalIssues}

## Services

${report.services
  .map(
    (service) => `
### ${service.name}

- **Type:** ${service.type}
- **Status:** ${service.status === 'active' ? '✅ Active' : '❌ Inactive'}
- **Last Audit:** ${new Date(service.lastAudit).toLocaleDateString()}

${
  service.issues.length > 0
    ? `
**Issues:**
${service.issues.map((i) => `- ⚠️  ${i}`).join('\n')}
`
    : '**No issues found.**'
}

**Recommendations:**
${service.recommendations.map((r) => `- ${r}`).join('\n')}
`
  )
  .join('\n---\n')}

## Action Items

${
  report.summary.criticalIssues > 0
    ? `
### Critical
${report.services
  .filter(
    (s) =>
      s.issues.some((i) => i.includes('not configured')) && s.type !== 'sentry'
  )
  .map((s) => `- [ ] Configure ${s.name}`)
  .join('\n')}
`
    : '✅ No critical issues found.'
}

### Routine Maintenance
- [ ] Review all service permissions and access controls
- [ ] Rotate API keys (if >90 days old)
- [ ] Verify backup and recovery procedures
- [ ] Update documentation with any configuration changes

## Next Audit

**Scheduled:** ${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString()}

## References

- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)
- [Stripe Security](https://stripe.com/docs/security/stripe)
- [Environment Variables](../env.md)
`;

  const outputPath = join(process.cwd(), 'docs', 'audits', 'services.md');
  writeFileSync(outputPath, md, 'utf-8');
  console.log(`\n✅ Markdown report written to: ${outputPath}`);
}

async function writeJsonReport(report: AuditReport) {
  const outputPath = join(process.cwd(), 'docs', 'audits', 'services.json');
  writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`✅ JSON report written to: ${outputPath}`);
}

async function main() {
  try {
    const report = await generateReport();

    // Print summary to console
    console.log('\n📊 Audit Summary:');
    console.log(`   Total Services: ${report.summary.total}`);
    console.log(`   Active: ${report.summary.active}`);
    console.log(`   Issues: ${report.summary.issues}`);
    console.log(`   Critical: ${report.summary.criticalIssues}`);

    // Write reports
    await writeMarkdownReport(report);
    await writeJsonReport(report);

    // Exit with error if critical issues found
    if (report.summary.criticalIssues > 0) {
      console.error(
        `\n❌ ${report.summary.criticalIssues} critical issues found. Review docs/audits/services.md`
      );
      process.exit(1);
    } else {
      console.log('\n✅ All services configured correctly.');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  }
}

main();
