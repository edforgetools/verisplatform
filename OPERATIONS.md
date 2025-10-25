# Veris Operations Guide

This document provides operational procedures for maintaining and operating the Veris platform in production.

## Table of Contents

- [Key Rotation Procedures](#key-rotation-procedures)
- [Incident Response](#incident-response)
- [Monitoring and Alerting](#monitoring-and-alerting)
- [Backup and Recovery](#backup-and-recovery)
- [Security Procedures](#security-procedures)
- [Performance Optimization](#performance-optimization)

## Key Rotation Procedures

### Cryptographic Key Rotation

Veris uses RSA keys for signing and verifying proofs. Key rotation is critical for security and must be performed without service interruption.

#### Prerequisites

- Access to production environment variables
- Backup of current keys
- Monitoring dashboard access
- Communication plan for stakeholders

#### Rotation Process

1. **Preparation Phase**

   ```bash
   # Generate new key pair
   openssl genrsa -out new_private.pem 2048
   openssl rsa -in new_private.pem -pubout -out new_public.pem

   # Verify key format
   openssl rsa -in new_private.pem -text -noout
   ```

2. **Dual-Key Window Setup**

   - Deploy new keys alongside existing keys
   - Update environment variables with both old and new keys
   - Verify both keys are loaded and functional
   - Monitor for any issues during dual-key period

3. **Cutover Process**

   - Update primary key references to use new keys
   - Keep old keys available for verification of existing proofs
   - Monitor system performance and error rates
   - Document rotation completion

4. **Cleanup Phase**
   - Remove old keys from environment (after verification period)
   - Update documentation
   - Archive old keys securely
   - Notify stakeholders of completion

#### Key Rotation Checklist

- [ ] New key pair generated and validated
- [ ] Keys stored securely (encrypted at rest)
- [ ] Dual-key configuration deployed
- [ ] All services restarted with new configuration
- [ ] Verification tests pass with both keys
- [ ] Monitoring shows no errors
- [ ] Old keys removed from active configuration
- [ ] Documentation updated
- [ ] Incident response team notified

### Database Credentials Rotation

#### Supabase Service Key Rotation

1. **Generate new service key** in Supabase dashboard
2. **Update environment variables** in all environments
3. **Deploy changes** with zero-downtime deployment
4. **Verify functionality** across all services
5. **Revoke old key** after verification period

#### Stripe Webhook Secret Rotation

1. **Generate new webhook secret** in Stripe dashboard
2. **Update environment variables**
3. **Deploy and verify** webhook functionality
4. **Update webhook endpoints** if needed
5. **Test webhook events** thoroughly

## Incident Response

### Severity Levels

- **P1 (Critical)**: Service completely down, data loss, security breach
- **P2 (High)**: Major functionality impacted, performance severely degraded
- **P3 (Medium)**: Minor functionality issues, performance degradation
- **P4 (Low)**: Cosmetic issues, non-critical bugs

### Response Procedures

#### P1/P2 Incidents

1. **Immediate Response** (0-15 minutes)

   - Acknowledge incident in monitoring system
   - Assess impact and scope
   - Notify incident response team
   - Begin initial investigation

2. **Investigation Phase** (15-60 minutes)

   - Gather logs and metrics
   - Identify root cause
   - Implement immediate mitigation if possible
   - Update stakeholders on progress

3. **Resolution Phase** (1-4 hours)

   - Implement permanent fix
   - Verify resolution
   - Monitor system stability
   - Document incident details

4. **Post-Incident** (24-48 hours)
   - Conduct post-mortem review
   - Update runbooks and procedures
   - Implement preventive measures
   - Share lessons learned

#### Communication Templates

**Initial Alert**

```
🚨 INCIDENT ALERT - P1/P2
Service: Veris Platform
Impact: [Description]
Status: Investigating
ETA: [Time]
Updates: [Channel]
```

**Status Update**

```
📊 INCIDENT UPDATE
Service: Veris Platform
Status: [Investigating/Resolved]
Progress: [Description]
Next Update: [Time]
```

**Resolution**

```
✅ INCIDENT RESOLVED
Service: Veris Platform
Duration: [Time]
Root Cause: [Description]
Prevention: [Actions taken]
```

### Escalation Matrix

| Role                | P1        | P2      | P3                | P4                |
| ------------------- | --------- | ------- | ----------------- | ----------------- |
| On-call Engineer    | Immediate | 30 min  | 2 hours           | Next business day |
| Engineering Manager | 15 min    | 1 hour  | 4 hours           | Next business day |
| CTO                 | 30 min    | 2 hours | Next business day | As needed         |

## Monitoring and Alerting

### Key Metrics

#### Application Metrics

- API response times (p50, p95, p99)
- Error rates by endpoint
- Request volume and patterns
- Database connection pool status
- Memory and CPU utilization

#### Business Metrics

- Proof creation success rate
- User authentication success rate
- Payment processing success rate
- File upload success rate

#### Infrastructure Metrics

- Server health and availability
- Database performance
- Redis cache hit rates
- CDN performance
- SSL certificate expiration

### Alerting Rules

#### Critical Alerts (P1)

- Service availability < 99%
- Error rate > 5%
- Database connection failures
- Payment processing failures
- Security-related events

#### Warning Alerts (P2)

- Response time > 2 seconds
- Error rate > 1%
- High memory usage > 80%
- SSL certificate expiring < 30 days

### Monitoring Tools

- **Application**: Vercel Analytics, Sentry
- **Infrastructure**: Vercel Functions monitoring
- **Database**: Supabase monitoring dashboard
- **Payments**: Stripe dashboard
- **Logs**: Vercel logs, Sentry error tracking

## Backup and Recovery

### Data Backup Strategy

#### Database Backups

- **Frequency**: Daily automated backups
- **Retention**: 30 days for daily, 12 months for weekly
- **Location**: Supabase managed backups + cross-region replication
- **Testing**: Monthly restore tests

#### Application State

- **Redis**: Daily snapshots with 7-day retention
- **File Storage**: S3 cross-region replication
- **Configuration**: Version controlled in Git

### Recovery Procedures

#### Database Recovery

1. **Assess damage** and determine recovery point
2. **Stop application** to prevent data corruption
3. **Restore from backup** using Supabase tools
4. **Verify data integrity** with checksums
5. **Restart application** and monitor
6. **Notify users** of any data loss

#### Application Recovery

1. **Deploy from last known good version**
2. **Verify environment variables**
3. **Check external service connectivity**
4. **Monitor system health**
5. **Gradually restore traffic**

### Disaster Recovery Plan

#### RTO (Recovery Time Objective): 4 hours

#### RPO (Recovery Point Objective): 1 hour

1. **Immediate Response** (0-1 hour)

   - Assess scope of disaster
   - Activate disaster recovery team
   - Begin recovery procedures

2. **Recovery Phase** (1-4 hours)

   - Restore from backups
   - Verify system integrity
   - Test critical functionality
   - Restore service

3. **Validation Phase** (4-8 hours)
   - Full system testing
   - Data integrity verification
   - Performance validation
   - User communication

## Security Procedures

### Security Monitoring

#### Automated Checks

- Failed authentication attempts
- Unusual API usage patterns
- Suspicious file uploads
- Payment fraud indicators
- SSL certificate monitoring

#### Manual Reviews

- Weekly security log review
- Monthly access audit
- Quarterly penetration testing
- Annual security assessment

### Incident Response for Security

1. **Immediate containment**
2. **Evidence preservation**
3. **Impact assessment**
4. **Notification to stakeholders**
5. **Recovery and remediation**
6. **Post-incident analysis**

### Access Management

#### Principle of Least Privilege

- Regular access reviews
- Automatic access expiration
- Multi-factor authentication required
- Audit logging for all access

#### Key Management

- Keys rotated quarterly
- Secure key storage
- Access logging
- Emergency key revocation procedures

## Performance Optimization

### Regular Maintenance

#### Weekly Tasks

- Review performance metrics
- Check for memory leaks
- Analyze slow queries
- Update dependencies

#### Monthly Tasks

- Performance testing
- Capacity planning review
- Security updates
- Backup verification

#### Quarterly Tasks

- Architecture review
- Technology stack updates
- Disaster recovery testing
- Security assessment

### Performance Monitoring

#### Key Performance Indicators

- Page load times < 2 seconds
- API response times < 500ms (p95)
- Database query times < 100ms
- Error rates < 0.1%

#### Optimization Strategies

- Database query optimization
- Caching implementation
- CDN utilization
- Code performance profiling
- Resource scaling

### Capacity Planning

#### Growth Projections

- User growth rate: 20% monthly
- Data growth rate: 15% monthly
- Traffic growth rate: 25% monthly

#### Scaling Triggers

- CPU utilization > 70%
- Memory usage > 80%
- Database connections > 80%
- Response times > 2 seconds

## Emergency Contacts

### Internal Team

- **On-call Engineer**: [Contact]
- **Engineering Manager**: [Contact]
- **CTO**: [Contact]
- **DevOps Lead**: [Contact]

### External Services

- **Vercel Support**: support@vercel.com
- **Supabase Support**: support@supabase.com
- **Stripe Support**: support@stripe.com
- **Sentry Support**: support@sentry.io

### Escalation Procedures

1. **Level 1**: On-call engineer
2. **Level 2**: Engineering manager
3. **Level 3**: CTO
4. **Level 4**: External vendor support

---

_Last updated: [Date]_
_Next review: [Date]_
