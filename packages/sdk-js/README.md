# Veris JavaScript SDK

Official JavaScript/TypeScript SDK for the Veris cryptographic proof platform.

## Installation

```bash
npm install @veris/sdk-js
# or
yarn add @veris/sdk-js
# or
pnpm add @veris/sdk-js
```

## Quick Start

```typescript
import { VerisClient } from "@veris/sdk-js";

const client = new VerisClient({
  baseUrl: "https://verisplatform.com",
  apiKey: "your_api_key_here", // Optional for public endpoints
});

// Create a proof
const proof = await client.createProof({
  file: fileData,
  userId: "user_123",
  project: "My Project",
});

console.log("Proof created:", proof.id);
```

## API Reference

### VerisClient

The main client class for interacting with the Veris API.

#### Constructor

```typescript
new VerisClient(config: VerisConfig)
```

**Config Options:**

- `baseUrl` (string, required): The base URL of the Veris API
- `apiKey` (string, optional): API key for authenticated requests
- `timeout` (number, optional): Request timeout in milliseconds (default: 30000)

### Methods

#### Proof Creation

##### `createProof(request: CreateProofRequest): Promise<CreateProofResponse>`

Creates a cryptographic proof for a file.

```typescript
const proof = await client.createProof({
  file: fileData,
  userId: "user_123",
  project: "My Project", // optional
});
```

#### Proof Retrieval

##### `getProof(id: string): Promise<GetProofResponse>`

Retrieves proof details by ID.

```typescript
const proof = await client.getProof("proof_123");
```

#### Proof Verification

##### `verifyProofByHash(hash: string): Promise<VerifyProofResponse>`

Verifies a proof using its hash (recommended method).

```typescript
const verification = await client.verifyProofByHash("a1b2c3d4e5f6...");
```

##### `verifyProofByHashPost(hash: string): Promise<VerifyProofResponse>`

Verifies a proof using its hash via POST request.

```typescript
const verification = await client.verifyProofByHashPost("a1b2c3d4e5f6...");
```

##### `verifyProofByFile(file: File): Promise<VerifyProofResponse>`

Verifies a proof by uploading a file.

```typescript
const verification = await client.verifyProofByFile(fileData);
```

##### `verifyProof(request: VerifyProofRequest): Promise<VerifyProofResponse>`

Legacy verification method for backward compatibility.

```typescript
// By ID
const verification = await client.verifyProof({
  id: "proof_123",
  file: fileData,
});

// By hash and signature
const verification = await client.verifyProof({
  hashHex: "a1b2c3d4e5f6...",
  signatureB64: "base64_signature...",
});
```

#### Registry Access

##### `searchProofsByHash(hash: string): Promise<RegistryProofResponse>`

Searches for proofs by hash in the registry.

```typescript
const proof = await client.searchProofsByHash("a1b2c3d4e5f6...");
```

##### `getProofFromRegistry(id: string): Promise<RegistryProofResponse>`

Retrieves a proof from the registry by ID.

```typescript
const proof = await client.getProofFromRegistry("proof_123");
```

#### Integrity & Health

##### `getLatestIntegrity(): Promise<IntegrityLatestResponse>`

Gets the latest integrity snapshot information.

```typescript
const latest = await client.getLatestIntegrity();
console.log("Latest batch:", latest.batch);
```

##### `getSnapshotIntegrity(batch: number): Promise<any>`

Gets integrity information for a specific snapshot batch.

```typescript
const snapshot = await client.getSnapshotIntegrity(1);
```

##### `getIntegrityHealth(): Promise<IntegrityHealthResponse>`

Gets the system health status.

```typescript
const health = await client.getIntegrityHealth();
console.log("System status:", health.status);
```

#### API Key Management

##### `setApiKey(apiKey: string): void`

Updates the API key for authenticated requests.

```typescript
client.setApiKey("new_api_key");
```

##### `clearApiKey(): void`

Removes the API key.

```typescript
client.clearApiKey();
```

## TypeScript Types

The SDK provides comprehensive TypeScript types:

```typescript
import {
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
  VerisError,
} from "@veris/sdk-js";
```

### Type Definitions

#### VerisConfig

```typescript
interface VerisConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}
```

#### CreateProofRequest

```typescript
interface CreateProofRequest {
  file: File;
  userId: string;
  project?: string;
}
```

#### CreateProofResponse

```typescript
interface CreateProofResponse {
  id: string;
  hash_prefix: string;
  timestamp: string;
  url: string;
}
```

#### VerifyProofResponse

```typescript
interface VerifyProofResponse {
  schema_version: number;
  proof_hash: string;
  valid: boolean;
  verified_at: string;
  signer_fp: string | null;
  source_registry: "primary" | "s3" | "arweave";
  errors: string[];
}
```

#### VerisError

```typescript
interface VerisError {
  error: string;
  code?: string;
  details?: any;
}
```

## Error Handling

The SDK throws `VerisError` objects for API errors:

```typescript
try {
  const proof = await client.createProof({
    file: fileData,
    userId: "user_123",
  });
} catch (error) {
  if (error.code === "RATE_LIMIT_EXCEEDED") {
    console.log("Rate limit exceeded, please wait");
  } else if (error.code === "AUTHENTICATION_REQUIRED") {
    console.log("Please provide a valid API key");
  } else {
    console.error("Error:", error.error);
  }
}
```

## Best Practices

### Performance

- Use hash-based verification (`verifyProofByHash`) for better performance
- Cache API responses when appropriate
- Implement proper timeout handling
- Use connection pooling for high-volume applications

### Security

- Store API keys securely (environment variables)
- Use HTTPS for all API calls
- Validate all inputs before sending
- Implement proper error handling

### Reliability

- Implement retry logic with exponential backoff
- Handle rate limiting gracefully
- Monitor API response times
- Use idempotency keys for critical operations

## Examples

### Complete Workflow

```typescript
import { VerisClient } from "@veris/sdk-js";

const client = new VerisClient({
  baseUrl: "https://verisplatform.com",
  apiKey: process.env.VERIS_API_KEY,
});

async function createAndVerifyProof(file: File) {
  try {
    // Create proof
    const proof = await client.createProof({
      file,
      userId: "user_123",
      project: "My Project",
    });

    console.log("Proof created:", proof.id);

    // Verify proof by hash
    const verification = await client.verifyProofByHash(proof.hash);

    if (verification.valid) {
      console.log("Proof verified successfully");
    } else {
      console.log("Proof verification failed:", verification.errors);
    }

    return { proof, verification };
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}
```

### Batch Operations

```typescript
async function createMultipleProofs(files: File[]) {
  const results = await Promise.allSettled(
    files.map((file) =>
      client.createProof({
        file,
        userId: "user_123",
      }),
    ),
  );

  const successful = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => (result as PromiseFulfilledResult<any>).value);

  const failed = results
    .filter((result) => result.status === "rejected")
    .map((result) => (result as PromiseRejectedResult).reason);

  return { successful, failed };
}
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Support

- **Documentation**: [https://verisplatform.com/docs](https://verisplatform.com/docs)
- **API Reference**: [https://verisplatform.com/docs/api](https://verisplatform.com/docs/api)
- **Community**: [Discord](https://discord.gg/veris)
- **Issues**: [GitHub Issues](https://github.com/verisplatform/veris/issues)

## License

Apache-2.0
