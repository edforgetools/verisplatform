"use client";

import { useState, useEffect } from "react";
import { SwaggerUI } from "@/components/SwaggerUI";

export default function ApiDocsPage() {
  const [openApiSpec, setOpenApiSpec] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOpenApiSpec = async () => {
      try {
        const response = await fetch("/openapi/openapi.yaml");
        if (!response.ok) {
          throw new Error(`Failed to load OpenAPI spec: ${response.statusText}`);
        }
        const yamlText = await response.text();

        // Parse YAML to JSON
        const yaml = await import("js-yaml");
        const spec = (yaml as any).load(yamlText);
        setOpenApiSpec(spec);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load API documentation");
      } finally {
        setLoading(false);
      }
    };

    loadOpenApiSpec();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading API documentation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Documentation</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Veris API Documentation</h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Comprehensive API reference for creating, verifying, and managing cryptographic proofs
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <SwaggerUI spec={openApiSpec} />
        </div>
      </div>
    </div>
  );
}
