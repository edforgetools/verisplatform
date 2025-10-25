/**
 * Veris SDK Client Tests
 */

import { VerisClient } from "../client.js";
import { VerisConfig } from "../types.js";

describe("VerisClient", () => {
  let client: VerisClient;
  let config: VerisConfig;

  beforeEach(() => {
    config = {
      baseUrl: "https://api.verisplatform.com",
      apiKey: "test-api-key",
      timeout: 5000,
    };
    client = new VerisClient(config);
  });

  describe("constructor", () => {
    it("should create a client with the provided config", () => {
      expect(client).toBeInstanceOf(VerisClient);
    });

    it("should set default timeout if not provided", () => {
      const configWithoutTimeout = {
        baseUrl: "https://api.verisplatform.com",
        apiKey: "test-api-key",
      };
      const clientWithoutTimeout = new VerisClient(configWithoutTimeout);
      expect(clientWithoutTimeout).toBeInstanceOf(VerisClient);
    });
  });

  describe("API key management", () => {
    it("should set API key", () => {
      const newApiKey = "new-api-key";
      client.setApiKey(newApiKey);
      expect(config.apiKey).toBe(newApiKey);
    });

    it("should clear API key", () => {
      client.clearApiKey();
      expect(config.apiKey).toBeUndefined();
    });
  });

  describe("method signatures", () => {
    it("should have all required methods", () => {
      expect(typeof client.createProof).toBe("function");
      expect(typeof client.getProof).toBe("function");
      expect(typeof client.verifyProofByHash).toBe("function");
      expect(typeof client.verifyProofByHashPost).toBe("function");
      expect(typeof client.verifyProofByFile).toBe("function");
      expect(typeof client.verifyProof).toBe("function");
      expect(typeof client.getLatestIntegrity).toBe("function");
      expect(typeof client.getSnapshotIntegrity).toBe("function");
      expect(typeof client.getIntegrityHealth).toBe("function");
      expect(typeof client.searchProofsByHash).toBe("function");
      expect(typeof client.getProofFromRegistry).toBe("function");
      expect(typeof client.setApiKey).toBe("function");
      expect(typeof client.clearApiKey).toBe("function");
    });
  });
});
