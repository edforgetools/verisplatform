import type { NextConfig } from "next";

// Environment validation is done at runtime in API routes and server components
// Do not import env here as it pulls in logger (pino) which uses Node.js APIs
// that cause client-side bundle issues

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply CSP to all pages
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' https://js.stripe.com https://vercel.live https://vitals.vercel-insights.com",
              "style-src 'self' 'unsafe-inline'", // Required for Tailwind CSS
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.stripe.com https://*.supabase.co https://*.supabase.com https://*.upstash.io https://*.vercel-insights.com https://vitals.vercel-insights.com",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-site",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Handle yaml package module resolution and prevent Node.js modules in client bundle
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };

    // Prevent server-only modules from being bundled in client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        process: false,
      };

      // Exclude pino and other server-only modules from client bundle
      config.externals = config.externals || [];
      config.externals.push({
        pino: "commonjs pino",
        "pino-pretty": "commonjs pino-pretty",
      });
    }

    return config;
  },
};

export default nextConfig;
