/**
 * API Documentation page
 */

import { Navigation } from "@/components/Navigation";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">API Documentation</h1>
        <div className="bg-gray-50 rounded-lg p-6">
          <p className="text-gray-600 mb-4">
            API documentation is available via the OpenAPI specification.
          </p>
          <div className="space-y-2">
            <p>
              <strong>OpenAPI Spec:</strong>{" "}
              <a
                href="/openapi/openapi.yaml"
                className="text-blue-600 hover:text-blue-800 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                /openapi/openapi.yaml
              </a>
            </p>
            <p>
              <strong>Interactive Documentation:</strong>{" "}
              <a
                href="https://editor.swagger.io/?url=/openapi/openapi.yaml"
                className="text-blue-600 hover:text-blue-800 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                View in Swagger Editor
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
