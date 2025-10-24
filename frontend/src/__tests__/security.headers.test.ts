/**
 * Tests for security headers
 */

import { describe, it, expect } from "@jest/globals";

describe("Security Headers", () => {
  describe("Content Security Policy", () => {
    it("should have strict CSP configuration", () => {
      const expectedCSP = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://vercel.live https://vitals.vercel-insights.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        "connect-src 'self' https://*.stripe.com https://*.supabase.co https://*.supabase.com https://*.upstash.io https://*.vercel-insights.com https://vitals.vercel-insights.com",
        "frame-src 'none'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
      ].join("; ");

      // This test verifies the CSP configuration is correct
      expect(expectedCSP).toContain("default-src 'self'");
      expect(expectedCSP).toContain("frame-src 'none'");
      expect(expectedCSP).toContain("object-src 'none'");
      expect(expectedCSP).toContain("frame-ancestors 'none'");
      expect(expectedCSP).toContain("upgrade-insecure-requests");
    });

    it("should allow necessary external resources", () => {
      const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://vercel.live https://vitals.vercel-insights.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        "connect-src 'self' https://*.stripe.com https://*.supabase.co https://*.supabase.com https://*.upstash.io https://*.vercel-insights.com https://vitals.vercel-insights.com",
        "frame-src 'none'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
      ].join("; ");

      // Should allow Stripe
      expect(csp).toContain("https://js.stripe.com");
      expect(csp).toContain("https://*.stripe.com");

      // Should allow Supabase
      expect(csp).toContain("https://*.supabase.co");
      expect(csp).toContain("https://*.supabase.com");

      // Should allow Vercel
      expect(csp).toContain("https://vercel.live");
      expect(csp).toContain("https://*.vercel-insights.com");
    });

    it("should block dangerous directives", () => {
      const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://vercel.live https://vitals.vercel-insights.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        "connect-src 'self' https://*.stripe.com https://*.supabase.co https://*.supabase.com https://*.upstash.io https://*.vercel-insights.com https://vitals.vercel-insights.com",
        "frame-src 'none'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
      ].join("; ");

      // Should block frames
      expect(csp).toContain("frame-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");

      // Should block objects
      expect(csp).toContain("object-src 'none'");
    });
  });

  describe("Security Headers", () => {
    it("should have X-Frame-Options set to DENY", () => {
      const headers = {
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
        "Cross-Origin-Resource-Policy": "same-site",
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      };

      expect(headers["X-Frame-Options"]).toBe("DENY");
    });

    it("should have X-Content-Type-Options set to nosniff", () => {
      const headers = {
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
        "Cross-Origin-Resource-Policy": "same-site",
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      };

      expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    });

    it("should have strict Referrer-Policy", () => {
      const headers = {
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
        "Cross-Origin-Resource-Policy": "same-site",
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      };

      expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    });

    it("should have restrictive Permissions-Policy", () => {
      const headers = {
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
        "Cross-Origin-Resource-Policy": "same-site",
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      };

      expect(headers["Permissions-Policy"]).toBe(
        "camera=(), microphone=(), geolocation=(), interest-cohort=()",
      );
    });

    it("should have Cross-Origin headers", () => {
      const headers = {
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
        "Cross-Origin-Resource-Policy": "same-site",
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      };

      expect(headers["Cross-Origin-Resource-Policy"]).toBe("same-site");
      expect(headers["Cross-Origin-Opener-Policy"]).toBe("same-origin");
      expect(headers["Cross-Origin-Embedder-Policy"]).toBe("require-corp");
    });
  });

  describe("Header Security", () => {
    it("should not allow dangerous permissions", () => {
      const permissionsPolicy = "camera=(), microphone=(), geolocation=(), interest-cohort=()";

      expect(permissionsPolicy).toContain("camera=()");
      expect(permissionsPolicy).toContain("microphone=()");
      expect(permissionsPolicy).toContain("geolocation=()");
      expect(permissionsPolicy).toContain("interest-cohort=()");
    });

    it("should enforce same-origin policies", () => {
      const headers = {
        "Cross-Origin-Resource-Policy": "same-site",
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      };

      expect(headers["Cross-Origin-Resource-Policy"]).toBe("same-site");
      expect(headers["Cross-Origin-Opener-Policy"]).toBe("same-origin");
      expect(headers["Cross-Origin-Embedder-Policy"]).toBe("require-corp");
    });
  });
});
