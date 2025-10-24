// Setup file that runs after the test environment is set up
// This file contains mocks that need to be set up after the environment

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
    arql: jestUnknown().mockResolvedValue([]),
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

// Mock AWS SDK
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({
      Body: {
        transformToString: jest.fn().mockResolvedValue('{"test": "data"}'),
        transformToByteArray: jest.fn().mockResolvedValue(Buffer.from("mock-data")),
      },
    }),
  })),
  GetObjectCommand: jest.fn(),
  PutObjectCommand: jest.fn(),
  HeadObjectCommand: jest.fn(),
  ListObjectsV2Command: jest.fn(),
  DeleteObjectCommand: jest.fn(),
}));

// Mock AWS S3 request presigner
jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn().mockResolvedValue("https://mock-signed-url.com"),
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
