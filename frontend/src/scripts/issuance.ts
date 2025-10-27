#!/usr/bin/env tsx

/**
 * Veris Proof Issuance Script
 *
 * This script implements the proof issuance pipeline as specified in the MVP checklist:
 * 1. Takes a file or payload input
 * 2. Generates SHA-256 hash and ISO8601 timestamp
 * 3. Signs with the project private key
 * 4. Outputs JSON with {hash, timestamp, signature, signer}
 * 5. Saves to /registry/<proof-id>.json
 *
 * Includes reproducibility test to confirm deterministic hashing.
 */

import fs from "fs";
import path from "path";
import { config } from "dotenv";
import { createCanonicalProof } from "../lib/proof-schema";
import { generateProofId } from "../lib/ids";
import { sha256 } from "../lib/crypto-server";

// Load environment variables
config({ path: path.join(process.cwd(), ".env.local") });

interface IssuanceOptions {
  input: string; // File path or payload string
  output?: string; // Output directory (default: ./registry)
  project?: string; // Project name for metadata
  userId?: string; // User ID for metadata
}

interface IssuanceResult {
  proofId: string;
  hash: string;
  timestamp: string;
  signature: string;
  signer: string;
  registryPath: string;
}

/**
 * Issue a proof for a file
 */
export async function issueProofForFile(
  filePath: string,
  options: Partial<IssuanceOptions> = {},
): Promise<IssuanceResult> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  return issueProofForBuffer(fileBuffer, fileName, options);
}

/**
 * Issue a proof for a buffer/payload
 */
export async function issueProofForBuffer(
  buffer: Buffer,
  fileName: string,
  options: Partial<IssuanceOptions> = {},
): Promise<IssuanceResult> {
  // Generate hash
  const hash = sha256(buffer);

  // Generate proof ID and timestamp
  const proofId = generateProofId();
  const timestamp = new Date().toISOString();

  // Create subject
  const subject = {
    type: "file",
    namespace: "veris",
    id: proofId,
  };

  // Create metadata
  const metadata = {
    file_name: fileName,
    project: options.project || null,
    user_id: options.userId || "system",
  };

  // Create canonical proof
  const canonicalProof = createCanonicalProof(hash, subject, metadata);
  const signedProof = canonicalizeAndSign(canonicalProof);

  // Determine output directory
  const outputDir = options.output || path.join(process.cwd(), "registry");

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save to registry
  const registryPath = path.join(outputDir, `${proofId}.json`);
  fs.writeFileSync(registryPath, JSON.stringify(signedProof, null, 2));

  return {
    proofId,
    hash,
    timestamp,
    signature: signedProof.signature,
    signer: signedProof.signer_fingerprint,
    registryPath,
  };
}

/**
 * Issue a proof for a string payload
 */
export async function issueProofForPayload(
  payload: string,
  fileName: string = "payload.txt",
  options: Partial<IssuanceOptions> = {},
): Promise<IssuanceResult> {
  const buffer = Buffer.from(payload, "utf8");
  return issueProofForBuffer(buffer, fileName, options);
}

/**
 * Test reproducibility - repeated runs should yield identical hash for identical input
 */
export async function testReproducibility(): Promise<boolean> {
  console.log("Testing reproducibility...");

  const testPayload = "This is a test payload for reproducibility testing.";
  const fileName = "reproducibility-test.txt";

  // Run issuance twice with identical input
  const result1 = await issueProofForPayload(testPayload, fileName);
  const result2 = await issueProofForPayload(testPayload, fileName);

  // Hash should be identical
  const hashesMatch = result1.hash === result2.hash;

  console.log(`First run hash:  ${result1.hash}`);
  console.log(`Second run hash: ${result2.hash}`);
  console.log(`Hashes match: ${hashesMatch}`);

  return hashesMatch;
}

/**
 * Generate 10 mock proofs for testing
 */
export async function generateMockProofs(outputDir?: string): Promise<IssuanceResult[]> {
  console.log("Generating 10 mock proofs...");

  const results: IssuanceResult[] = [];

  for (let i = 1; i <= 10; i++) {
    const payload = `Mock proof content #${i} - Generated at ${new Date().toISOString()}`;
    const fileName = `mock-proof-${i}.txt`;

    const result = await issueProofForPayload(payload, fileName, {
      output: outputDir,
      project: "mock-proofs",
      userId: "test-user",
    });

    results.push(result);
    console.log(`Generated proof ${i}/10: ${result.proofId}`);
  }

  return results;
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case "file":
        if (args.length < 2) {
          console.error("Usage: tsx issuance.ts file <file-path> [output-dir]");
          process.exit(1);
        }
        const filePath = args[1];
        const outputDir = args[2];
        const result = await issueProofForFile(filePath, { output: outputDir });
        console.log("Proof issued successfully:");
        console.log(JSON.stringify(result, null, 2));
        break;

      case "payload":
        if (args.length < 2) {
          console.error("Usage: tsx issuance.ts payload <payload-string> [output-dir]");
          process.exit(1);
        }
        const payload = args[1];
        const payloadOutputDir = args[2];
        const payloadResult = await issueProofForPayload(payload, "payload.txt", {
          output: payloadOutputDir,
        });
        console.log("Proof issued successfully:");
        console.log(JSON.stringify(payloadResult, null, 2));
        break;

      case "test-reproducibility":
        const isReproducible = await testReproducibility();
        console.log(`Reproducibility test ${isReproducible ? "PASSED" : "FAILED"}`);
        process.exit(isReproducible ? 0 : 1);
        break;

      case "mock-proofs":
        const mockOutputDir = args[1];
        await generateMockProofs(mockOutputDir);
        console.log("Mock proofs generated successfully");
        break;

      default:
        console.log("Veris Proof Issuance Script");
        console.log("");
        console.log("Usage:");
        console.log("  tsx issuance.ts file <file-path> [output-dir]     - Issue proof for file");
        console.log(
          "  tsx issuance.ts payload <payload> [output-dir]    - Issue proof for payload",
        );
        console.log("  tsx issuance.ts test-reproducibility              - Test reproducibility");
        console.log(
          "  tsx issuance.ts mock-proofs [output-dir]          - Generate 10 mock proofs",
        );
        break;
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  main();
}

export type { IssuanceResult, IssuanceOptions };
