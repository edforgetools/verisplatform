"use client";

import { useEffect, useRef } from "react";

interface SwaggerUIProps {
  spec: any;
}

export function SwaggerUI({ spec }: SwaggerUIProps) {
  const swaggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadSwaggerUI = async () => {
      if (!swaggerRef.current || !spec) return;

      try {
        // Dynamically import Swagger UI
        const SwaggerUIBundle = (await import("swagger-ui-dist/swagger-ui-bundle.js"))
          .default as any;

        // Clear any existing content
        swaggerRef.current.innerHTML = "";

        // Initialize Swagger UI
        SwaggerUIBundle({
          spec: spec,
          dom_id: swaggerRef.current,
          deepLinking: true,
          presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.presets.standalone],
          plugins: [SwaggerUIBundle.plugins.DownloadUrl],
          layout: "StandaloneLayout",
          tryItOutEnabled: true,
          requestInterceptor: (request: any) => {
            // Add any custom request headers or modifications here
            return request;
          },
          responseInterceptor: (response: any) => {
            // Add any custom response handling here
            return response;
          },
        });
      } catch (error) {
        console.error("Failed to load Swagger UI:", error);
        if (swaggerRef.current) {
          swaggerRef.current.innerHTML = `
            <div class="p-8 text-center">
              <div class="text-red-600 text-6xl mb-4">⚠️</div>
              <h2 class="text-2xl font-bold text-gray-900 mb-2">Failed to Load API Documentation</h2>
              <p class="text-gray-600">There was an error loading the interactive API documentation.</p>
            </div>
          `;
        }
      }
    };

    loadSwaggerUI();
  }, [spec]);

  return (
    <div className="swagger-ui-container">
      <div ref={swaggerRef} className="swagger-ui" />
      <style jsx global>{`
        .swagger-ui-container {
          min-height: 600px;
        }

        .swagger-ui .topbar {
          display: none;
        }

        .swagger-ui .info {
          margin: 20px 0;
        }

        .swagger-ui .info .title {
          color: #1f2937;
          font-size: 2rem;
          font-weight: bold;
        }

        .swagger-ui .info .description {
          color: #6b7280;
          font-size: 1.1rem;
          line-height: 1.6;
        }

        .swagger-ui .scheme-container {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          margin: 20px 0;
        }

        .swagger-ui .opblock {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          margin: 16px 0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .swagger-ui .opblock.opblock-post {
          border-left: 4px solid #10b981;
        }

        .swagger-ui .opblock.opblock-get {
          border-left: 4px solid #3b82f6;
        }

        .swagger-ui .opblock.opblock-put {
          border-left: 4px solid #f59e0b;
        }

        .swagger-ui .opblock.opblock-delete {
          border-left: 4px solid #ef4444;
        }

        .swagger-ui .opblock-summary {
          padding: 16px;
          cursor: pointer;
          background: #ffffff;
          border-radius: 8px 8px 0 0;
        }

        .swagger-ui .opblock-summary:hover {
          background: #f9fafb;
        }

        .swagger-ui .opblock-description-wrapper {
          padding: 16px;
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
        }

        .swagger-ui .btn {
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .swagger-ui .btn:hover {
          background: #2563eb;
        }

        .swagger-ui .btn.execute {
          background: #10b981;
        }

        .swagger-ui .btn.execute:hover {
          background: #059669;
        }

        .swagger-ui .response-col_status {
          font-weight: 600;
        }

        .swagger-ui .response-col_status-200 {
          color: #10b981;
        }

        .swagger-ui .response-col_status-400,
        .swagger-ui .response-col_status-401,
        .swagger-ui .response-col_status-403,
        .swagger-ui .response-col_status-404,
        .swagger-ui .response-col_status-429,
        .swagger-ui .response-col_status-500 {
          color: #ef4444;
        }
      `}</style>
    </div>
  );
}
