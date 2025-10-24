// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Mock environment variables for testing
process.env.NODE_ENV = "test";
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "test-anon-key";
process.env.NEXT_PUBLIC_STRIPE_MODE = "test";
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder";
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "whsec_placeholder";
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "placeholder-service-key";
process.env.VERIS_SIGNING_PRIVATE_KEY =
  process.env.VERIS_SIGNING_PRIVATE_KEY || "placeholder-private-key-".repeat(10);
process.env.VERIS_SIGNING_PUBLIC_KEY =
  process.env.VERIS_SIGNING_PUBLIC_KEY || "placeholder-public-key-".repeat(10);
process.env.CRON_JOB_TOKEN = process.env.CRON_JOB_TOKEN || "placeholder-cron-token";
process.env.UPSTASH_REDIS_REST_URL =
  process.env.UPSTASH_REDIS_REST_URL || "https://placeholder-redis.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN || "placeholder-redis-token";
process.env.supabaseservicekey = process.env.supabaseservicekey || "placeholder-service-key";
process.env.REGISTRY_S3_BUCKET = process.env.REGISTRY_S3_BUCKET || "test-bucket";
process.env.ARWEAVE_WALLET_JSON =
  process.env.ARWEAVE_WALLET_JSON || '{"kty":"EC","crv":"P-256","x":"test","y":"test","d":"test"}';
process.env.AWS_REGION = process.env.AWS_REGION || "us-east-1";

// Mock crypto module
jest.mock("crypto", () => {
  const mockCrypto = {
    createSign: jest.fn(() => ({
      update: jest.fn(),
      end: jest.fn(),
      sign: jest.fn(() => "mock-signature-base64"),
    })),
    createVerify: jest.fn(() => ({
      update: jest.fn(),
      end: jest.fn(),
      verify: jest.fn(() => true),
    })),
    createHash: jest.fn(() => ({
      update: jest.fn(),
      digest: jest.fn(() => "mock-hash-hex"),
    })),
  };
  return {
    __esModule: true,
    default: mockCrypto,
    ...mockCrypto,
  };
});

// Mock crypto-server module
jest.mock("./src/lib/crypto-server", () => ({
  sha256: jest.fn((buf) => "mock-hash"),
  signHash: jest.fn((hash) => "mock-signature-base64"),
  verifySignature: jest.fn((hash, signature) => true),
  getKeyFingerprint: jest.fn(() => "mock-hash-hex"),
}));

// Mock external dependencies that cause issues in tests
jest.mock("arweave", () => ({
  default: jest.fn().mockImplementation(() => ({
    transactions: {
      get: jest.fn().mockResolvedValue({}),
      sign: jest.fn().mockResolvedValue(undefined),
      post: jest.fn().mockResolvedValue({ status: 200 }),
    },
    wallets: {
      jwkToAddress: jest.fn().mockResolvedValue("test-address"),
    },
    createTransaction: jest.fn().mockResolvedValue({
      addTag: jest.fn(),
    }),
    arql: jest.fn().mockResolvedValue([]),
  })),
  init: jest.fn().mockImplementation(() => ({
    transactions: {
      get: jest.fn().mockResolvedValue({}),
      sign: jest.fn().mockResolvedValue(undefined),
      post: jest.fn().mockResolvedValue({ status: 200 }),
    },
    wallets: {
      jwkToAddress: jest.fn().mockResolvedValue("test-address"),
    },
    createTransaction: jest.fn().mockResolvedValue({
      addTag: jest.fn(),
    }),
    arql: jest.fn().mockResolvedValue([]),
  })),
}));

jest.mock("@upstash/redis", () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
    set: jest.fn().mockResolvedValue("OK"),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(-1),
  })),
}));

jest.mock("@upstash/ratelimit", () => ({
  Ratelimit: jest.fn().mockImplementation(() => ({
    limit: jest
      .fn()
      .mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: Date.now() + 60000 }),
  })),
}));

// Mock crypto module
jest.mock("crypto", () => ({
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue("mock-hash"),
  }),
  randomBytes: jest.fn().mockReturnValue(Buffer.from("mock-random")),
  randomUUID: jest.fn().mockReturnValue("mock-uuid"),
}));

// Mock AWS SDK
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({
      Body: {
        transformToString: jest.fn().mockResolvedValue("mock-content"),
        transformToByteArray: jest.fn().mockResolvedValue(Buffer.from("mock-data")),
      },
    }),
  })),
  GetObjectCommand: jest.fn(),
  PutObjectCommand: jest.fn(),
  HeadObjectCommand: jest.fn(),
}));

// Mock canonical-json
jest.mock("canonical-json", () => {
  const mockCanonicalJson = jest.fn((obj) => JSON.stringify(obj));
  return {
    __esModule: true,
    default: mockCanonicalJson,
    stringify: mockCanonicalJson,
    stringifyCopy: mockCanonicalJson,
  };
});
