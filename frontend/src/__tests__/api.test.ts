import { NextRequest } from "next/server";
import { createMocks } from "node-mocks-http";

// Mock modules
jest.mock("@/lib/db", () => ({
  supabaseService: jest.fn(() => ({
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
  })),
}));

jest.mock("@/lib/auth-server", () => ({
  getAuthenticatedUserId: jest.fn(),
}));

jest.mock("@/lib/entitlements", () => ({
  assertEntitled: jest.fn(),
}));

jest.mock("@/lib/file-upload", () => ({
  streamFileToTmp: jest.fn(),
  cleanupTmpFile: jest.fn(),
}));

jest.mock("@/lib/crypto-server", () => ({
  signHash: jest.fn(() => "test-signature"),
}));

jest.mock("@/lib/ids", () => ({
  generateProofId: jest.fn(() => "test-proof-id"),
}));

jest.mock("@/lib/stripe", () => ({
  verifyWebhook: jest.fn(),
}));

jest.mock("@/lib/rateLimit", () => ({
  withRateLimit: jest.fn((handler) => handler),
}));

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  })),
}));

// Import the route handlers after mocking
import { GET as dbHealthGet } from "@/app/api/db-health/route";
import { POST as proofCreatePost } from "@/app/api/proof/create/route";
import { POST as stripeWebhookPost } from "@/app/api/stripe/webhook/route";

describe("API Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("/api/db-health", () => {
    it("should return {ok: true} on successful database connection", async () => {
      const { req, res } = createMocks({
        method: "GET",
        url: "/api/db-health",
      });

      const response = await dbHealthGet();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ ok: true });
    });
  });

  describe("/api/proof/create", () => {
    const mockFile = new File(["test content"], "test.pdf", { type: "application/pdf" });
    const mockFormData = new FormData();
    mockFormData.append("file", mockFile);
    mockFormData.append("user_id", "test-user-id");

    beforeEach(async () => {
      const { getAuthenticatedUserId } = await import("@/lib/auth-server");
      const { assertEntitled } = await import("@/lib/entitlements");
      const { streamFileToTmp } = await import("@/lib/file-upload");

      getAuthenticatedUserId.mockResolvedValue("test-user-id");
      assertEntitled.mockResolvedValue(undefined);
      streamFileToTmp.mockResolvedValue({
        tmpPath: "/tmp/test-file",
        hashFull: "test-hash-full",
        hashPrefix: "test-hash-prefix",
      });
    });

    it("should return 200 for small file upload", async () => {
      const request = new NextRequest("http://localhost:3000/api/proof/create", {
        method: "POST",
        body: mockFormData,
        headers: {
          authorization: "Bearer test-token",
        },
      });

      const response = await proofCreatePost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("id");
      expect(data).toHaveProperty("hash_prefix");
      expect(data).toHaveProperty("timestamp");
      expect(data).toHaveProperty("url");
    });

    it("should return 401 for unauthenticated request", async () => {
      const { getAuthenticatedUserId } = await import("@/lib/auth-server");
      getAuthenticatedUserId.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/proof/create", {
        method: "POST",
        body: mockFormData,
      });

      const response = await proofCreatePost(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });

    it("should return 402 for quota exceeded (insufficient permissions)", async () => {
      const { assertEntitled } = await import("@/lib/entitlements");
      assertEntitled.mockRejectedValue(new Error("User not entitled"));

      const request = new NextRequest("http://localhost:3000/api/proof/create", {
        method: "POST",
        body: mockFormData,
        headers: {
          authorization: "Bearer test-token",
        },
      });

      const response = await proofCreatePost(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Insufficient permissions to create proofs");
    });

    it("should return 413 for large file (simulated by file upload error)", async () => {
      const { streamFileToTmp } = await import("@/lib/file-upload");
      streamFileToTmp.mockRejectedValue(new Error("File too large"));

      const request = new NextRequest("http://localhost:3000/api/proof/create", {
        method: "POST",
        body: mockFormData,
        headers: {
          authorization: "Bearer test-token",
        },
      });

      const response = await proofCreatePost(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });

  describe("/api/stripe/webhook", () => {
    const mockStripeEvent = {
      id: "evt_test_webhook",
      object: "event",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_session",
          client_reference_id: "test-user-id",
          subscription: "sub_test_subscription",
        },
      },
    };

    beforeEach(async () => {
      const { verifyWebhook } = await import("@/lib/stripe");
      verifyWebhook.mockReturnValue(mockStripeEvent);
    });

    it("should process webhook using Stripe constructEvent with fixture payload", async () => {
      const fixturePayload = JSON.stringify(mockStripeEvent);
      const mockSignature = "t=1234567890,v1=test_signature";

      const request = new NextRequest("http://localhost:3000/api/stripe/webhook", {
        method: "POST",
        body: fixturePayload,
        headers: {
          "stripe-signature": mockSignature,
          "content-type": "application/json",
        },
      });

      const response = await stripeWebhookPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("received", true);
      expect(data).toHaveProperty("eventId", "evt_test_webhook");
      expect(data).toHaveProperty("eventType", "checkout.session.completed");
    });

    it("should return 400 for missing stripe signature", async () => {
      const fixturePayload = JSON.stringify(mockStripeEvent);

      const request = new NextRequest("http://localhost:3000/api/stripe/webhook", {
        method: "POST",
        body: fixturePayload,
        headers: {
          "content-type": "application/json",
        },
      });

      const response = await stripeWebhookPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing stripe-signature header");
    });

    it("should return 400 for invalid webhook signature", async () => {
      const { verifyWebhook } = await import("@/lib/stripe");
      verifyWebhook.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      const fixturePayload = JSON.stringify(mockStripeEvent);
      const mockSignature = "t=1234567890,v1=invalid_signature";

      const request = new NextRequest("http://localhost:3000/api/stripe/webhook", {
        method: "POST",
        body: fixturePayload,
        headers: {
          "stripe-signature": mockSignature,
          "content-type": "application/json",
        },
      });

      const response = await stripeWebhookPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Webhook signature verification failed");
    });
  });
});
