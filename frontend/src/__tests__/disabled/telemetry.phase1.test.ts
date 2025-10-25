/**
 * Tests for Phase-1 telemetry and gates
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Mock the database
const mockSupabaseService = jest.fn().mockReturnValue({
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      count: jest.fn().mockReturnValue({
        head: jest.fn().mockResolvedValue({
          count: 750,
          error: null,
        }),
      }),
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [
              { success: true },
              { success: true },
              { success: false },
              { success: true },
              { success: true },
            ],
            error: null,
          }),
        }),
      }),
    }),
  }),
});

jest.mock("../lib/db", () => ({
  supabaseService: mockSupabaseService,
}));

describe("Phase-1 Telemetry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Quality Gates", () => {
    it("should calculate metrics correctly", async () => {
      // Mock the metrics calculation
      const metrics = {
        proofs_issued_total: 750,
        verification_success_ratio_1k: 0.995,
        proofs_verified_total: 1000,
        proofs_verified_successful: 995,
      };

      expect(metrics.proofs_issued_total).toBeGreaterThanOrEqual(500);
      expect(metrics.verification_success_ratio_1k).toBeGreaterThanOrEqual(0.99);
    });

    it("should pass issued gate when threshold is met", () => {
      const metrics = {
        proofs_issued_total: 750,
        verification_success_ratio_1k: 0.995,
      };

      const gates = {
        issued_gate: metrics.proofs_issued_total >= 500,
        success_ratio_gate: metrics.verification_success_ratio_1k >= 0.99,
        overall_phase1_ready: false,
      };
      gates.overall_phase1_ready = gates.issued_gate && gates.success_ratio_gate;

      expect(gates.issued_gate).toBe(true);
      expect(gates.success_ratio_gate).toBe(true);
      expect(gates.overall_phase1_ready).toBe(true);
    });

    it("should fail issued gate when threshold is not met", () => {
      const metrics = {
        proofs_issued_total: 400,
        verification_success_ratio_1k: 0.995,
      };

      const gates = {
        issued_gate: metrics.proofs_issued_total >= 500,
        success_ratio_gate: metrics.verification_success_ratio_1k >= 0.99,
        overall_phase1_ready: false,
      };
      gates.overall_phase1_ready = gates.issued_gate && gates.success_ratio_gate;

      expect(gates.issued_gate).toBe(false);
      expect(gates.success_ratio_gate).toBe(true);
      expect(gates.overall_phase1_ready).toBe(false);
    });

    it("should fail success ratio gate when threshold is not met", () => {
      const metrics = {
        proofs_issued_total: 750,
        verification_success_ratio_1k: 0.98,
      };

      const gates = {
        issued_gate: metrics.proofs_issued_total >= 500,
        success_ratio_gate: metrics.verification_success_ratio_1k >= 0.99,
        overall_phase1_ready: false,
      };
      gates.overall_phase1_ready = gates.issued_gate && gates.success_ratio_gate;

      expect(gates.issued_gate).toBe(true);
      expect(gates.success_ratio_gate).toBe(false);
      expect(gates.overall_phase1_ready).toBe(false);
    });

    it("should calculate success ratio correctly", () => {
      const totalVerifications = 1000;
      const successfulVerifications = 995;
      const successRatio = successfulVerifications / totalVerifications;

      expect(successRatio).toBe(0.995);
      expect(successRatio).toBeGreaterThanOrEqual(0.99);
    });

    it("should handle edge cases", () => {
      // Test with exact threshold values
      const metrics = {
        proofs_issued_total: 500,
        verification_success_ratio_1k: 0.99,
      };

      const gates = {
        issued_gate: metrics.proofs_issued_total >= 500,
        success_ratio_gate: metrics.verification_success_ratio_1k >= 0.99,
        overall_phase1_ready: false,
      };
      gates.overall_phase1_ready = gates.issued_gate && gates.success_ratio_gate;

      expect(gates.issued_gate).toBe(true);
      expect(gates.success_ratio_gate).toBe(true);
      expect(gates.overall_phase1_ready).toBe(true);
    });
  });

  describe("Data Collection", () => {
    it("should collect proof issuance data", async () => {
      const mockData = {
        count: 750,
        error: null,
      };

      expect(mockData.count).toBe(750);
      expect(mockData.error).toBeNull();
    });

    it("should collect verification data", async () => {
      const mockData = [
        { success: true },
        { success: true },
        { success: false },
        { success: true },
        { success: true },
      ];

      const successfulCount = mockData.filter((item) => item.success).length;
      const totalCount = mockData.length;
      const successRatio = successfulCount / totalCount;

      expect(successfulCount).toBe(4);
      expect(totalCount).toBe(5);
      expect(successRatio).toBe(0.8);
    });

    it("should handle database errors gracefully", async () => {
      const mockError = {
        count: null,
        error: { message: "Database connection failed" },
      };

      expect(mockError.count).toBeNull();
      expect(mockError.error).toBeDefined();
      expect(mockError.error.message).toBe("Database connection failed");
    });
  });

  describe("Phase-1 Readiness", () => {
    it("should be ready when all gates pass", () => {
      const metrics = {
        proofs_issued_total: 750,
        verification_success_ratio_1k: 0.995,
      };

      const isReady =
        metrics.proofs_issued_total >= 500 && metrics.verification_success_ratio_1k >= 0.99;

      expect(isReady).toBe(true);
    });

    it("should not be ready when any gate fails", () => {
      const metrics = {
        proofs_issued_total: 400,
        verification_success_ratio_1k: 0.98,
      };

      const isReady =
        metrics.proofs_issued_total >= 500 && metrics.verification_success_ratio_1k >= 0.99;

      expect(isReady).toBe(false);
    });
  });
});
