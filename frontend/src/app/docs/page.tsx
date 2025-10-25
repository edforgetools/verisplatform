"use client";

import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">Veris Documentation</h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Everything you need to integrate Veris cryptographic proof platform into your
              applications
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/docs/api"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
              >
                API Reference
              </Link>
              <Link
                href="/docs/sdk"
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
              >
                SDK Documentation
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Quick Start */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Quick Start</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <div className="text-4xl mb-4">🔐</div>
              <h3 className="text-xl font-semibold mb-4">Create Proofs</h3>
              <p className="text-gray-600 mb-4">
                Upload files to create cryptographic proofs with timestamps and signatures.
              </p>
              <Link
                href="/docs/api#create-proof"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Learn more →
              </Link>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-xl font-semibold mb-4">Verify Proofs</h3>
              <p className="text-gray-600 mb-4">
                Verify file integrity using hash-based or file-based verification methods.
              </p>
              <Link
                href="/docs/api#verify-proof"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Learn more →
              </Link>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold mb-4">Registry Access</h3>
              <p className="text-gray-600 mb-4">
                Search and retrieve proofs from the public registry using hashes or IDs.
              </p>
              <Link
                href="/docs/api#registry"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Learn more →
              </Link>
            </div>
          </div>
        </section>

        {/* Documentation Sections */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Documentation</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Link
              href="/docs/api"
              className="group bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center mb-4">
                <div className="text-3xl mr-4">📡</div>
                <h3 className="text-2xl font-semibold group-hover:text-blue-600 transition-colors">
                  API Reference
                </h3>
              </div>
              <p className="text-gray-600 mb-4">
                Complete REST API documentation with interactive examples, request/response schemas,
                and error codes.
              </p>
              <div className="text-blue-600 font-medium group-hover:text-blue-700">
                Explore API →
              </div>
            </Link>
            <Link
              href="/docs/sdk"
              className="group bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center mb-4">
                <div className="text-3xl mr-4">⚡</div>
                <h3 className="text-2xl font-semibold group-hover:text-green-600 transition-colors">
                  SDK Documentation
                </h3>
              </div>
              <p className="text-gray-600 mb-4">
                Official SDKs for JavaScript/TypeScript, Python, and cURL examples with best
                practices.
              </p>
              <div className="text-green-600 font-medium group-hover:text-green-700">
                Get Started →
              </div>
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Platform Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <div className="text-3xl mb-3">🔒</div>
              <h3 className="font-semibold mb-2">Cryptographic Security</h3>
              <p className="text-gray-600 text-sm">SHA256 hashing and RSA-SHA256 signatures</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <div className="text-3xl mb-3">⏰</div>
              <h3 className="font-semibold mb-2">Timestamping</h3>
              <p className="text-gray-600 text-sm">Precise timestamps for proof creation</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <div className="text-3xl mb-3">🌐</div>
              <h3 className="font-semibold mb-2">Public Registry</h3>
              <p className="text-gray-600 text-sm">Immutable, queryable proof storage</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="font-semibold mb-2">Integrity Monitoring</h3>
              <p className="text-gray-600 text-sm">Merkle trees and snapshot validation</p>
            </div>
          </div>
        </section>

        {/* Getting Started */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Getting Started</h2>
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4">1. Choose Your Integration</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>
                    • <strong>SDK:</strong> Use our official SDKs for easy integration
                  </li>
                  <li>
                    • <strong>REST API:</strong> Direct HTTP calls for maximum control
                  </li>
                  <li>
                    • <strong>Web Interface:</strong> Use our web app for manual operations
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4">2. Authentication</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>
                    • <strong>Public endpoints:</strong> No authentication required
                  </li>
                  <li>
                    • <strong>Protected endpoints:</strong> Supabase JWT tokens
                  </li>
                  <li>
                    • <strong>Magic links:</strong> Passwordless authentication
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4">3. Create Your First Proof</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Upload a file via API or SDK</li>
                  <li>• Receive proof ID and hash</li>
                  <li>• Store the proof ID for later verification</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4">4. Verify Proofs</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Use hash-based verification for performance</li>
                  <li>• Use file-based verification for convenience</li>
                  <li>• Check verification results and timestamps</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Support */}
        <section className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Need Help?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="text-3xl mb-3">💬</div>
              <h3 className="font-semibold mb-2">Community Support</h3>
              <p className="text-gray-600 text-sm mb-4">
                Join our Discord community for help and discussions
              </p>
              <a
                href="https://discord.gg/veris"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Join Discord →
              </a>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="text-3xl mb-3">📧</div>
              <h3 className="font-semibold mb-2">Email Support</h3>
              <p className="text-gray-600 text-sm mb-4">Get help from our support team</p>
              <a
                href="mailto:support@verisplatform.com"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Contact Support →
              </a>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="text-3xl mb-3">🐛</div>
              <h3 className="font-semibold mb-2">Report Issues</h3>
              <p className="text-gray-600 text-sm mb-4">Found a bug? Report it on GitHub</p>
              <a
                href="https://github.com/verisplatform/veris/issues"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Report Bug →
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
