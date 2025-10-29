import type { NextConfig } from "next";

// Environment validation is done at runtime in API routes and server components
// Do not import env here as it pulls in logger (pino) which uses Node.js APIs
// that cause client-side bundle issues

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self';",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
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
