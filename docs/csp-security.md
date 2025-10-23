# Content Security Policy (CSP) Configuration

## Overview

This document describes the Content Security Policy (CSP) headers configured for the Veris application to enhance security and prevent common web vulnerabilities.

## CSP Configuration

The CSP is configured in `frontend/next.config.ts` and applies to all pages of the application.

### Security Headers Applied

1. **Content-Security-Policy** - Controls resource loading and execution
2. **X-Frame-Options** - Prevents clickjacking attacks
3. **X-Content-Type-Options** - Prevents MIME type sniffing
4. **Referrer-Policy** - Controls referrer information sharing
5. **Permissions-Policy** - Restricts browser feature access

## CSP Directives Breakdown

### default-src 'self'
- **Purpose**: Default policy for all resource types
- **Allow**: Only same-origin resources
- **Security Impact**: Prevents loading of arbitrary external resources

### script-src
- **Allowed Sources**:
  - `'self'` - Same-origin scripts
  - `'unsafe-inline'` - Inline scripts (required for Next.js)
  - `'unsafe-eval'` - Dynamic code evaluation (required for Next.js development)
  - `https://js.stripe.com` - Stripe JavaScript SDK
  - `https://vercel.live` - Vercel Live Preview
  - `https://vitals.vercel-insights.com` - Vercel Analytics

### style-src
- **Allowed Sources**:
  - `'self'` - Same-origin stylesheets
  - `'unsafe-inline'` - Inline styles (required for CSS-in-JS frameworks)

### img-src
- **Allowed Sources**:
  - `'self'` - Same-origin images
  - `data:` - Data URIs (for embedded images)
  - `blob:` - Blob URLs (for dynamically generated images)
  - `https:` - All HTTPS images

### connect-src
- **Allowed Sources**:
  - `'self'` - Same-origin connections
  - `https://*.stripe.com` - Stripe API endpoints
  - `https://*.supabase.co` - Supabase database connections
  - `https://*.supabase.com` - Supabase service connections
  - `https://*.upstash.io` - Upstash Redis connections
  - `https://*.vercel-insights.com` - Vercel Analytics
  - `https://vitals.vercel-insights.com` - Vercel Vitals

### frame-src
- **Allowed Sources**:
  - `'self'` - Same-origin frames
  - `https://js.stripe.com` - Stripe payment forms
  - `https://hooks.stripe.com` - Stripe webhook endpoints

## Security Exceptions and Justifications

### Unsafe Inline Scripts (`'unsafe-inline'`)
- **Reason**: Next.js requires inline scripts for:
  - Runtime JavaScript
  - Development hot reloading
  - Client-side hydration
- **Risk**: Potential XSS if malicious scripts are injected
- **Mitigation**: Code review, input sanitization, and proper authentication

### Unsafe Eval (`'unsafe-eval'`)
- **Reason**: Next.js development mode requires dynamic code evaluation
- **Risk**: Code injection attacks
- **Mitigation**: This should be disabled in production builds

### External Domains
- **Stripe Domains**: Required for payment processing functionality
- **Supabase Domains**: Required for database and authentication services
- **Upstash Domains**: Required for Redis rate limiting
- **Vercel Domains**: Required for analytics and deployment features

## Production Considerations

### Recommended Production CSP
For production deployment, consider tightening the CSP by:

1. **Removing `'unsafe-eval'`** - Not needed in production builds
2. **Implementing nonces** - Replace `'unsafe-inline'` with nonce-based CSP
3. **Strict-Transport-Security** - Add HSTS headers for HTTPS enforcement
4. **Report-Only Mode** - Use CSP reporting to monitor violations

### Example Production CSP
```javascript
// Production CSP (more restrictive)
"script-src 'self' 'nonce-{RANDOM}' https://js.stripe.com https://vitals.vercel-insights.com",
"style-src 'self' 'nonce-{RANDOM}'",
```

## Monitoring and Maintenance

### CSP Violation Reporting
Consider implementing CSP violation reporting to monitor for:
- Blocked resource loads
- Potential security issues
- Policy effectiveness

### Regular Review
- Review CSP policy quarterly
- Update when adding new third-party services
- Test CSP changes in staging environment
- Monitor browser console for CSP violations

## Testing CSP

### Browser Developer Tools
1. Open browser developer tools
2. Check console for CSP violation reports
3. Test all application functionality
4. Verify external resources load correctly

### Automated Testing
Consider adding CSP validation to your CI/CD pipeline to catch policy issues early.

## References

- [MDN Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [OWASP Content Security Policy](https://owasp.org/www-project-cheat-sheets/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
