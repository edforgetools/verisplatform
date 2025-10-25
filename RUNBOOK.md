# Veris Pilot Deployment Runbook

This runbook provides step-by-step instructions for deploying Veris to a pilot environment and conducting initial testing.

## Table of Contents

- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Environment Setup](#environment-setup)
- [Deployment Process](#deployment-process)
- [Post-Deployment Verification](#post-deployment-verification)
- [Pilot Testing Procedures](#pilot-testing-procedures)
- [Monitoring and Alerting Setup](#monitoring-and-alerting-setup)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting Guide](#troubleshooting-guide)

## Pre-Deployment Checklist

### Infrastructure Requirements

- [ ] Vercel account with appropriate permissions
- [ ] Supabase project created and configured
- [ ] Stripe account with test/live keys configured
- [ ] Domain name registered and DNS configured
- [ ] SSL certificates provisioned
- [ ] Monitoring tools configured (Sentry, Vercel Analytics)

### Security Requirements

- [ ] Cryptographic keys generated and secured
- [ ] Environment variables configured securely
- [ ] Access controls implemented
- [ ] Rate limiting configured
- [ ] CORS policies configured
- [ ] Security headers implemented

### Code Quality Requirements

- [ ] All tests passing (unit, integration, e2e)
- [ ] Code review completed
- [ ] Security scan completed
- [ ] Performance testing completed
- [ ] Documentation updated
- [ ] Dependencies updated and audited

## Environment Setup

### 1. Supabase Configuration

```bash
# Create new Supabase project
supabase projects create veris-pilot

# Apply database schema
supabase db push --project-id <project-id>

# Generate TypeScript types
supabase gen types typescript --project-id <project-id> > frontend/src/lib/db-types.ts
```

### 2. Environment Variables

Create `.env.local` with the following variables:

```bash
# Site Configuration
NEXT_PUBLIC_SITE_URL=https://pilot.verisplatform.com

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
supabaseservicekey=<service-key>

# Stripe Configuration
NEXT_PUBLIC_STRIPE_MODE=test
STRIPE_SECRET_KEY=sk_test_<key>
STRIPE_WEBHOOK_SECRET=whsec_<secret>
NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID=price_<id>
NEXT_PUBLIC_TEAM_MONTHLY_PRICE_ID=price_<id>

# Cryptographic Keys
VERIS_SIGNING_PRIVATE_KEY=<private-key>
VERIS_SIGNING_PUBLIC_KEY=<public-key>

# Security
CRON_JOB_TOKEN=<secure-token>
INTERNAL_KEY=<secure-key>

# Monitoring
SENTRY_DSN=<sentry-dsn>
```

### 3. Key Generation

```bash
# Generate RSA key pair
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# Convert to single-line format for environment variables
cat private.pem | tr '\n' '\\n'
cat public.pem | tr '\n' '\\n'
```

### 4. Stripe Configuration

1. **Create Products and Prices**

   ```bash
   # Create Pro plan
   stripe products create --name "Veris Pro" --description "Professional plan"
   stripe prices create --product <product-id> --unit-amount 2900 --currency usd --recurring interval=month

   # Create Team plan
   stripe products create --name "Veris Team" --description "Team plan"
   stripe prices create --product <product-id> --unit-amount 9900 --currency usd --recurring interval=month
   ```

2. **Configure Webhooks**
   ```bash
   # Create webhook endpoint
   stripe webhook_endpoints create \
     --url https://pilot.verisplatform.com/api/stripe/webhook \
     --enabled-events customer.subscription.created \
     --enabled-events customer.subscription.updated \
     --enabled-events customer.subscription.deleted \
     --enabled-events invoice.payment_succeeded \
     --enabled-events invoice.payment_failed
   ```

## Deployment Process

### 1. Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to pilot environment
vercel --prod --env-file .env.local

# Set environment variables
vercel env add NEXT_PUBLIC_SITE_URL
vercel env add NEXT_PUBLIC_SUPABASE_URL
# ... (add all environment variables)
```

### 2. Domain Configuration

```bash
# Add custom domain
vercel domains add pilot.verisplatform.com

# Configure DNS
# Add CNAME record: pilot -> cname.vercel-dns.com
```

### 3. SSL Certificate

SSL certificates are automatically provisioned by Vercel for custom domains.

### 4. Database Migration

```bash
# Run any pending migrations
supabase db push --project-id <project-id>

# Verify schema
supabase db diff --project-id <project-id>
```

## Post-Deployment Verification

### 1. Health Checks

```bash
# Test database connectivity
curl https://pilot.verisplatform.com/api/db-health

# Expected response:
{
  "data": {
    "status": "healthy",
    "database": "connected",
    "redis": "connected",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### 2. Authentication Flow

```bash
# Test magic link authentication
curl -X POST https://pilot.verisplatform.com/api/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Expected response:
{
  "data": {
    "message": "Magic link sent to your email",
    "expires_at": "2024-01-15T11:30:00Z"
  }
}
```

### 3. Proof Creation

```bash
# Test proof creation (requires authentication)
curl -X POST https://pilot.verisplatform.com/api/proof/create \
  -H "Authorization: Bearer <token>" \
  -F "file=@test-file.txt" \
  -F "user_id=test-user" \
  -F "project=Test Project"
```

### 4. Stripe Integration

```bash
# Test checkout session creation
curl -X POST https://pilot.verisplatform.com/api/stripe/create-checkout \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "price_id": "price_test_123",
    "success_url": "https://pilot.verisplatform.com/success",
    "cancel_url": "https://pilot.verisplatform.com/cancel"
  }'
```

## Pilot Testing Procedures

### 1. User Acceptance Testing

#### Test Scenarios

1. **User Registration and Authentication**

   - [ ] Magic link authentication works
   - [ ] User can access dashboard after authentication
   - [ ] Session persistence works correctly
   - [ ] Logout functionality works

2. **Proof Creation**

   - [ ] File upload works for various file types
   - [ ] Proof creation completes successfully
   - [ ] Proof data is stored correctly
   - [ ] Error handling for invalid files

3. **Proof Verification**

   - [ ] Proof verification works with original file
   - [ ] Verification fails with modified file
   - [ ] Certificate download works
   - [ ] Proof sharing functionality works

4. **Billing Integration**

   - [ ] Subscription creation works
   - [ ] Payment processing works
   - [ ] Webhook handling works
   - [ ] User tier updates correctly

5. **Performance Testing**
   - [ ] Page load times < 2 seconds
   - [ ] API response times < 500ms
   - [ ] File upload handles large files
   - [ ] Concurrent user handling

### 2. Load Testing

```bash
# Install artillery
npm install -g artillery

# Run load test
artillery run load-test-config.yml
```

### 3. Security Testing

- [ ] Authentication bypass attempts
- [ ] SQL injection attempts
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Rate limiting effectiveness
- [ ] File upload security

### 4. Error Handling Testing

- [ ] Network failure scenarios
- [ ] Database connection failures
- [ ] External service failures
- [ ] Invalid input handling
- [ ] Rate limit exceeded scenarios

## Monitoring and Alerting Setup

### 1. Vercel Analytics

- [ ] Enable Vercel Analytics
- [ ] Configure custom events
- [ ] Set up performance monitoring
- [ ] Configure error tracking

### 2. Sentry Configuration

```javascript
// Configure Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: "pilot",
  tracesSampleRate: 1.0,
  beforeSend(event) {
    // Filter out sensitive data
    if (event.user) {
      delete event.user.email;
    }
    return event;
  },
});
```

### 3. Custom Monitoring

```bash
# Set up uptime monitoring
# Configure alerts for:
# - Service availability
# - Response time degradation
# - Error rate increases
# - Database connectivity issues
```

### 4. Log Aggregation

- [ ] Configure log collection
- [ ] Set up log parsing
- [ ] Create log dashboards
- [ ] Configure log-based alerts

## Rollback Procedures

### 1. Code Rollback

```bash
# Rollback to previous deployment
vercel rollback <deployment-url>

# Or rollback to specific commit
vercel --prod --force
```

### 2. Database Rollback

```bash
# Rollback database migrations
supabase db reset --project-id <project-id>

# Restore from backup
supabase db restore --project-id <project-id> --backup-id <backup-id>
```

### 3. Configuration Rollback

```bash
# Revert environment variables
vercel env rm <variable-name>
vercel env add <variable-name>

# Or restore from backup
cp .env.local.backup .env.local
vercel env pull .env.local
```

### 4. Domain Rollback

```bash
# Remove custom domain
vercel domains rm pilot.verisplatform.com

# Revert DNS changes
# Remove CNAME record from DNS provider
```

## Troubleshooting Guide

### Common Issues

#### 1. Authentication Failures

**Symptoms:**

- Magic link not received
- Authentication errors
- Session not persisting

**Solutions:**

```bash
# Check Supabase configuration
curl https://<project-id>.supabase.co/rest/v1/

# Verify environment variables
vercel env ls

# Check email delivery
# Review Supabase Auth logs
```

#### 2. Database Connection Issues

**Symptoms:**

- 500 errors on API calls
- Database health check failing
- Connection timeouts

**Solutions:**

```bash
# Check database status
supabase status --project-id <project-id>

# Test connection
psql "postgresql://postgres:<password>@<host>:5432/postgres"

# Check connection pool settings
```

#### 3. File Upload Issues

**Symptoms:**

- File upload failures
- Large file timeouts
- Storage quota exceeded

**Solutions:**

```bash
# Check file size limits
# Verify Vercel function timeout settings
# Check Supabase storage configuration
```

#### 4. Stripe Integration Issues

**Symptoms:**

- Payment failures
- Webhook not received
- Subscription not created

**Solutions:**

```bash
# Test Stripe connection
stripe balance retrieve

# Check webhook configuration
stripe webhook_endpoints list

# Verify webhook signature
# Check Stripe logs
```

### Debug Commands

```bash
# Check application logs
vercel logs --follow

# Test API endpoints
curl -v https://pilot.verisplatform.com/api/db-health

# Check environment variables
vercel env ls

# Test database connection
supabase db ping --project-id <project-id>

# Check Stripe webhook
stripe listen --forward-to https://pilot.verisplatform.com/api/stripe/webhook
```

### Performance Debugging

```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://pilot.verisplatform.com/api/db-health

# Monitor memory usage
vercel logs --follow | grep "memory"

# Check database performance
supabase db logs --project-id <project-id>
```

## Success Criteria

### Technical Criteria

- [ ] All health checks passing
- [ ] Response times < 500ms (p95)
- [ ] Error rate < 0.1%
- [ ] Uptime > 99.9%
- [ ] All tests passing

### Business Criteria

- [ ] User registration flow works
- [ ] Proof creation and verification works
- [ ] Payment processing works
- [ ] User can access all features
- [ ] Performance meets requirements

### Security Criteria

- [ ] Authentication working correctly
- [ ] Authorization enforced
- [ ] Data encryption in transit and at rest
- [ ] No security vulnerabilities
- [ ] Rate limiting effective

## Post-Pilot Actions

### 1. Performance Analysis

- [ ] Analyze performance metrics
- [ ] Identify bottlenecks
- [ ] Plan optimization improvements
- [ ] Document lessons learned

### 2. User Feedback

- [ ] Collect user feedback
- [ ] Analyze usage patterns
- [ ] Identify feature requests
- [ ] Plan product improvements

### 3. Production Preparation

- [ ] Update documentation
- [ ] Prepare production environment
- [ ] Plan production deployment
- [ ] Set up production monitoring

### 4. Team Handover

- [ ] Document operational procedures
- [ ] Train support team
- [ ] Create escalation procedures
- [ ] Set up on-call rotation

---

_Last updated: 2024-01-15_
_Pilot Environment: pilot.verisplatform.com_
