"use client";

import { useState } from "react";

export default function SdkDocsPage() {
  const [activeTab, setActiveTab] = useState("javascript");

  const codeExamples = {
    javascript: {
      installation: `npm install @veris/sdk-js
# or
yarn add @veris/sdk-js
# or
pnpm add @veris/sdk-js`,
      basic: `import { VerisClient } from "@veris/sdk-js";

const client = new VerisClient({
  baseUrl: "https://verisplatform.com",
  apiKey: "your_api_key_here", // Optional for public endpoints
});

// Create a proof
const proof = await client.createProof({
  file: fileData,
  userId: "user_123",
  project: "My Project"
});

console.log("Proof created:", proof.id);`,
      verification: `// Verify by hash (recommended)
const verification = await client.verifyProofByHash(
  "a1b2c3d4e5f6..."
);

// Verify by file upload
const fileVerification = await client.verifyProofByFile(fileData);

// Verify using legacy method
const legacyVerification = await client.verifyProof({
  id: "proof_123",
  file: fileData
});`,
      registry: `// Search for proofs by hash
const proof = await client.searchProofsByHash(
  "a1b2c3d4e5f6..."
);

// Get proof by ID from registry
const registryProof = await client.getProofFromRegistry(
  "proof_123"
);`,
      integrity: `// Get latest integrity snapshot
const latest = await client.getLatestIntegrity();
console.log("Latest batch:", latest.batch);

// Get specific snapshot
const snapshot = await client.getSnapshotIntegrity(1);

// Check system health
const health = await client.getIntegrityHealth();
console.log("System status:", health.status);`,
      errorHandling: `try {
  const proof = await client.createProof({
    file: fileData,
    userId: "user_123"
  });
} catch (error) {
  if (error.code === "RATE_LIMIT_EXCEEDED") {
    console.log("Rate limit exceeded, please wait");
  } else if (error.code === "AUTHENTICATION_REQUIRED") {
    console.log("Please provide a valid API key");
  } else {
    console.error("Error:", error.error);
  }
}`,
    },
    python: {
      installation: `pip install veris-sdk
# or
poetry add veris-sdk`,
      basic: `from veris import VerisClient

client = VerisClient(
    base_url="https://verisplatform.com",
    api_key="your_api_key_here"  # Optional for public endpoints
)

# Create a proof
with open("document.pdf", "rb") as f:
    proof = client.create_proof(
        file=f,
        user_id="user_123",
        project="My Project"
    )

print(f"Proof created: {proof.id}")`,
      verification: `# Verify by hash (recommended)
verification = client.verify_proof_by_hash(
    "a1b2c3d4e5f6..."
)

# Verify by file upload
with open("document.pdf", "rb") as f:
    file_verification = client.verify_proof_by_file(f)

# Verify using legacy method
with open("document.pdf", "rb") as f:
    legacy_verification = client.verify_proof(
        id="proof_123",
        file=f
    )`,
      registry: `# Search for proofs by hash
proof = client.search_proofs_by_hash(
    "a1b2c3d4e5f6..."
)

# Get proof by ID from registry
registry_proof = client.get_proof_from_registry(
    "proof_123"
)`,
      integrity: `# Get latest integrity snapshot
latest = client.get_latest_integrity()
print(f"Latest batch: {latest.batch}")

# Get specific snapshot
snapshot = client.get_snapshot_integrity(1)

# Check system health
health = client.get_integrity_health()
print(f"System status: {health.status}")`,
      errorHandling: `try:
    with open("document.pdf", "rb") as f:
        proof = client.create_proof(
            file=f,
            user_id="user_123"
        )
except VerisError as e:
    if e.code == "RATE_LIMIT_EXCEEDED":
        print("Rate limit exceeded, please wait")
    elif e.code == "AUTHENTICATION_REQUIRED":
        print("Please provide a valid API key")
    else:
        print(f"Error: {e.error}")`,
    },
    curl: {
      installation: `# No installation required for cURL
# Just use your system's curl command`,
      basic: `# Create a proof
curl -X POST https://verisplatform.com/api/proof/create \\
  -H "Authorization: Bearer your_api_key" \\
  -F "file=@document.pdf" \\
  -F "user_id=user_123" \\
  -F "project=My Project"`,
      verification: `# Verify by hash (recommended)
curl -X GET "https://verisplatform.com/api/verify?hash=a1b2c3d4e5f6..."

# Verify by file upload
curl -X POST https://verisplatform.com/api/verify \\
  -F "file=@document.pdf"`,
      registry: `# Search for proofs by hash
curl -X GET "https://verisplatform.com/api/registry/search?hash=a1b2c3d4e5f6..."

# Get proof by ID from registry
curl -X GET "https://verisplatform.com/api/registry/proof_123"`,
      integrity: `# Get latest integrity snapshot
curl -X GET https://verisplatform.com/api/integrity/latest

# Get specific snapshot
curl -X GET https://verisplatform.com/api/integrity/snapshot/1

# Check system health
curl -X GET https://verisplatform.com/api/integrity/health`,
      errorHandling: `# cURL error handling
# Check HTTP status codes in your response
# 200: Success
# 400: Bad Request
# 401: Unauthorized
# 404: Not Found
# 429: Rate Limited
# 500: Server Error`,
    },
  };

  const TabButton = ({ id, label }: { id: string; label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        activeTab === id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );

  const CodeBlock = ({ code, language }: { code: string; language: string }) => (
    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
      <code className={`language-${language}`}>{code}</code>
    </pre>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Veris SDK Documentation</h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Official SDKs and libraries for integrating Veris into your applications
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Language Tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            <TabButton id="javascript" label="JavaScript/TypeScript" />
            <TabButton id="python" label="Python" />
            <TabButton id="curl" label="cURL" />
          </div>

          {/* Installation */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Installation</h2>
            <CodeBlock
              code={codeExamples[activeTab as keyof typeof codeExamples].installation}
              language={activeTab}
            />
          </section>

          {/* Basic Usage */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Basic Usage</h2>
            <p className="text-gray-600 mb-4">
              Create a client instance and start creating proofs for your files.
            </p>
            <CodeBlock
              code={codeExamples[activeTab as keyof typeof codeExamples].basic}
              language={activeTab}
            />
          </section>

          {/* Verification */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Proof Verification</h2>
            <p className="text-gray-600 mb-4">
              Verify proofs using multiple methods. Hash-based verification is recommended for
              performance.
            </p>
            <CodeBlock
              code={codeExamples[activeTab as keyof typeof codeExamples].verification}
              language={activeTab}
            />
          </section>

          {/* Registry Access */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Registry Access</h2>
            <p className="text-gray-600 mb-4">
              Search and retrieve proofs from the public registry.
            </p>
            <CodeBlock
              code={codeExamples[activeTab as keyof typeof codeExamples].registry}
              language={activeTab}
            />
          </section>

          {/* Integrity & Health */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Integrity & Health</h2>
            <p className="text-gray-600 mb-4">
              Monitor system health and access integrity snapshots.
            </p>
            <CodeBlock
              code={codeExamples[activeTab as keyof typeof codeExamples].integrity}
              language={activeTab}
            />
          </section>

          {/* Error Handling */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Handling</h2>
            <p className="text-gray-600 mb-4">
              Handle errors gracefully with proper error codes and messages.
            </p>
            <CodeBlock
              code={codeExamples[activeTab as keyof typeof codeExamples].errorHandling}
              language={activeTab}
            />
          </section>

          {/* TypeScript Types */}
          {activeTab === "javascript" && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">TypeScript Types</h2>
              <p className="text-gray-600 mb-4">
                Full TypeScript support with comprehensive type definitions.
              </p>
              <CodeBlock
                code={`import {
  VerisClient,
  VerisConfig,
  CreateProofRequest,
  CreateProofResponse,
  VerifyProofRequest,
  VerifyProofResponse,
  GetProofResponse,
  IntegrityLatestResponse,
  IntegrityHealthResponse,
  RegistryProofResponse,
  VerisError
} from "@veris/sdk-js";

// Type-safe client configuration
const config: VerisConfig = {
  baseUrl: "https://verisplatform.com",
  apiKey: "your_api_key",
  timeout: 30000
};

// Type-safe proof creation
const createProof = async (request: CreateProofRequest): Promise<CreateProofResponse> => {
  return await client.createProof(request);
};`}
                language="typescript"
              />
            </section>
          )}

          {/* Best Practices */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Best Practices</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Performance</h3>
                <ul className="text-blue-800 space-y-1">
                  <li>• Use hash-based verification for better performance</li>
                  <li>• Cache API responses when appropriate</li>
                  <li>• Implement proper timeout handling</li>
                  <li>• Use connection pooling for high-volume applications</li>
                </ul>
              </div>
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-green-900 mb-2">Security</h3>
                <ul className="text-green-800 space-y-1">
                  <li>• Store API keys securely (environment variables)</li>
                  <li>• Use HTTPS for all API calls</li>
                  <li>• Validate all inputs before sending</li>
                  <li>• Implement proper error handling</li>
                </ul>
              </div>
              <div className="bg-yellow-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">Reliability</h3>
                <ul className="text-yellow-800 space-y-1">
                  <li>• Implement retry logic with exponential backoff</li>
                  <li>• Handle rate limiting gracefully</li>
                  <li>• Monitor API response times</li>
                  <li>• Use idempotency keys for critical operations</li>
                </ul>
              </div>
              <div className="bg-purple-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-900 mb-2">Development</h3>
                <ul className="text-purple-800 space-y-1">
                  <li>• Use TypeScript for better type safety</li>
                  <li>• Write comprehensive tests</li>
                  <li>• Follow semantic versioning</li>
                  <li>• Document your integration</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Support */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Support & Resources</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <div className="text-3xl mb-2">📚</div>
                <h3 className="font-semibold mb-2">Documentation</h3>
                <p className="text-gray-600 text-sm">Complete API reference and guides</p>
              </div>
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <div className="text-3xl mb-2">💬</div>
                <h3 className="font-semibold mb-2">Community</h3>
                <p className="text-gray-600 text-sm">Join our Discord for support</p>
              </div>
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <div className="text-3xl mb-2">🐛</div>
                <h3 className="font-semibold mb-2">Issues</h3>
                <p className="text-gray-600 text-sm">Report bugs on GitHub</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
