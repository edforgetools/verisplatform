import { NextRequest } from "next/server";
import { createMocks } from "node-mocks-http";

// Mock modules - moved to setup file but keeping some specific mocks here
const mockSupabaseService = jest.fn(() => ({
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      limit: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      eq: jest.fn(() => ({
        single: jest.fn(() =>
          Promise.resolve({
            data: {
              id: "test-proof-id",
              hash_full: "test-hash",
              signature: "test-signature",
              timestamp: new Date().toISOString(),
              anchor_txid: null,
              file_name: "test.pdf",
              created_at: new Date().toISOString(),
            },
            error: null,
          }),
        ),
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() =>
          Promise.resolve({
            data: { id: "test-proof-id", user_id: "test-user", file_name: "test.pdf" },
            error: null,
          }),
        ),
      })),
    })),
    upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  })),
}));

const mockSupabaseAdmin = jest.fn(() => ({
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      limit: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() =>
          Promise.resolve({
            data: { id: "test-proof-id", user_id: "test-user", file_name: "test.pdf" },
            error: null,
          }),
        ),
      })),
    })),
    upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  })),
}));

// Mock the modules
jest.mock("@/lib/db", () => ({
  supabaseService: mockSupabaseService,
}));

jest.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: mockSupabaseAdmin,
}));

jest.mock("@/lib/crypto-server", () => ({
  signHash: jest.fn((hash: string) => "mock-signature-base64"),
  verifySignature: jest.fn((hash: string, signature: string) => true),
  getKeyFingerprint: jest.fn(() => "mock-fingerprint-base64url"),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("@/lib/rateLimit", () => ({
  withRateLimit: jest.fn((handler) => handler),
}));

jest.mock("@/lib/idempotency", () => ({
  withIdempotency: jest.fn((handler) => handler),
}));

jest.mock("@/lib/auth-server", () => ({
  getAuthenticatedUserId: jest.fn(() => Promise.resolve("test-user")),
}));

jest.mock("@/lib/entitlements", () => ({
  assertEntitled: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/lib/file-upload", () => ({
  streamFileToTmp: jest.fn(() =>
    Promise.resolve({
      tmpPath: "/tmp/test-file",
      hashFull: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
      hashPrefix: "abc123",
    }),
  ),
  cleanupTmpFile: jest.fn(),
}));

jest.mock("@/lib/ids", () => ({
  generateProofId: jest.fn(() => "test-proof-id"),
}));

jest.mock("@/lib/billing-service", () => ({
  recordBillingEvent: jest.fn(() => Promise.resolve()),
}));

// Mock crypto-server specifically for API tests
jest.mock("@/lib/crypto-server", () => ({
  sha256: jest.fn((buf: Buffer) => "mock-hash"),
  signHash: jest.fn((hash: string) => "mock-signature-base64"),
  verifySignature: jest.fn((hash: string, signature: string) => true),
  getKeyFingerprint: jest.fn(() => "mock-hash-hex"),
}));

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  })),
}));

describe("API Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Proof Creation", () => {
    it("should create a proof successfully", async () => {
      // Create a mock file
      const mockFile = new File(["test content"], "test.pdf", { type: "application/pdf" });

      // Create FormData
      const formData = new FormData();
      formData.append("file", mockFile);
      formData.append("user_id", "test-user");

      // Mock the request
      const mockRequest = new NextRequest("http://localhost:3000/api/proof/create", {
        method: "POST",
        body: formData,
      });

      // Import the handler dynamically to avoid hoisting issues
      const { POST } = await import("@/app/api/proof/create/route");

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("id");
      expect(data).toHaveProperty("hash_prefix");
    });

    it("should handle missing file content", async () => {
      // Create FormData without file
      const formData = new FormData();
      formData.append("user_id", "test-user");

      const mockRequest = new NextRequest("http://localhost:3000/api/proof/create", {
        method: "POST",
        body: formData,
      });

      const { POST } = await import("@/app/api/proof/create/route");

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error");
    });
  });

  describe("Proof Verification", () => {
    it("should verify a proof successfully", async () => {
      const mockRequest = new NextRequest("http://localhost:3000/api/proof/verify", {
        method: "POST",
        body: JSON.stringify({
          id: "test-proof-id",
        }),
        headers: {
          "content-type": "application/json",
        },
      });

      const { POST } = await import("@/app/api/proof/verify/route");

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveProperty("valid");
      expect(data.data).toHaveProperty("proof_hash");
    });

    it("should handle missing proof ID", async () => {
      const mockRequest = new NextRequest("http://localhost:3000/api/proof/verify", {
        method: "POST",
        body: JSON.stringify({}),
        headers: {
          "content-type": "application/json",
        },
      });

      const { POST } = await import("@/app/api/proof/verify/route");

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error");
    });
  });

  describe("Health Check", () => {
    it("should return health status", async () => {
      const { GET } = await import("@/app/api/db-health/route");

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveProperty("ok");
    });
  });
});
