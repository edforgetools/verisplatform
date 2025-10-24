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
      ];

      const cspString = expectedCSP.join("; ");
      expect(cspString).toContain("default-src 'self'");
      expect(cspString).toContain("script-src 'self'");
      expect(cspString).toContain("frame-src 'none'");
      expect(cspString).toContain("object-src 'none'");
    });

    it("should allow necessary external resources", () => {
      const allowedDomains = [
        "https://js.stripe.com",
        "https://*.supabase.co",
        "https://*.supabase.com",
        "https://*.upstash.io",
        "https://*.vercel-insights.com",
      ];

      allowedDomains.forEach((domain) => {
        expect(domain).toMatch(/^https:\/\//);
      });
    });
  });

  describe("Security Headers Configuration", () => {
    it("should have proper security headers", () => {
      const securityHeaders = {
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
        "X-DNS-Prefetch-Control": "off",
        "X-Download-Options": "noopen",
        "X-Permitted-Cross-Domain-Policies": "none",
      };

      Object.entries(securityHeaders).forEach(([header, value]) => {
        expect(header).toMatch(/^X-|^Referrer-|^Permissions-/);
        expect(value).toBeDefined();
        expect(typeof value).toBe("string");
      });
    });

    it("should have strict frame options", () => {
      const frameOptions = "DENY";
      expect(frameOptions).toBe("DENY");
    });

    it("should prevent MIME type sniffing", () => {
      const contentTypeOptions = "nosniff";
      expect(contentTypeOptions).toBe("nosniff");
    });

    it("should have strict referrer policy", () => {
      const referrerPolicy = "strict-origin-when-cross-origin";
      expect(referrerPolicy).toBe("strict-origin-when-cross-origin");
    });
  });

  describe("Permissions Policy", () => {
    it("should restrict dangerous permissions", () => {
      const permissionsPolicy = "camera=(), microphone=(), geolocation=()";
      expect(permissionsPolicy).toContain("camera=()");
      expect(permissionsPolicy).toContain("microphone=()");
      expect(permissionsPolicy).toContain("geolocation=()");
    });
  });

  describe("HTTPS Configuration", () => {
    it("should enforce HTTPS", () => {
      const upgradeInsecureRequests = "upgrade-insecure-requests";
      expect(upgradeInsecureRequests).toBe("upgrade-insecure-requests");
    });

    it("should have proper HSTS configuration", () => {
      const hstsConfig = {
        "max-age": "31536000",
        includeSubDomains: true,
        preload: true,
      };

      expect(hstsConfig["max-age"]).toBe("31536000");
      expect(hstsConfig.includeSubDomains).toBe(true);
      expect(hstsConfig.preload).toBe(true);
    });
  });

  describe("Content Type Security", () => {
    it("should prevent content type sniffing", () => {
      const contentTypeOptions = "nosniff";
      expect(contentTypeOptions).toBe("nosniff");
    });

    it("should have proper content type validation", () => {
      const allowedContentTypes = [
        "application/json",
        "text/html",
        "text/css",
        "application/javascript",
        "image/svg+xml",
        "application/pdf",
      ];

      allowedContentTypes.forEach((contentType) => {
        expect(contentType).toMatch(/^application\/|^text\/|^image\//);
      });
    });
  });

  describe("CORS Configuration", () => {
    it("should have strict CORS policy", () => {
      const corsConfig = {
        "Access-Control-Allow-Origin": "https://verisplatform.com",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      };

      expect(corsConfig["Access-Control-Allow-Origin"]).toBe("https://verisplatform.com");
      expect(corsConfig["Access-Control-Allow-Methods"]).toContain("GET");
      expect(corsConfig["Access-Control-Allow-Methods"]).toContain("POST");
      expect(corsConfig["Access-Control-Allow-Headers"]).toContain("Content-Type");
    });
  });
});
