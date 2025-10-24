/**
 * Tests for billing rules and pricing logic
 */

import { describe, it, expect } from "@jest/globals";
import { shouldBill, getPricingRules, getBillingSummary, BillingEvent } from "../lib/pricing_rules";

describe("Billing Rules", () => {
  describe("shouldBill", () => {
    it("should bill for successful proof creation", () => {
      const event: BillingEvent = {
        type: "proof.create",
        userId: "user-123",
        proofId: "proof-456",
        success: true,
      };

      expect(shouldBill(event)).toBe(true);
    });

    it("should not bill for failed proof creation", () => {
      const event: BillingEvent = {
        type: "proof.create",
        userId: "user-123",
        success: false,
      };

      expect(shouldBill(event)).toBe(false);
    });

    it("should not bill for proof creation without proof ID", () => {
      const event: BillingEvent = {
        type: "proof.create",
        userId: "user-123",
        success: true,
      };

      expect(shouldBill(event)).toBe(false);
    });

    it("should not bill for proof verification", () => {
      const event: BillingEvent = {
        type: "proof.verify",
        userId: "user-123",
        proofId: "proof-456",
        success: true,
      };

      expect(shouldBill(event)).toBe(false);
    });

    it("should not bill for proof retrieval", () => {
      const event: BillingEvent = {
        type: "proof.get",
        userId: "user-123",
        proofId: "proof-456",
        success: true,
      };

      expect(shouldBill(event)).toBe(false);
    });

    it("should not bill for integrity checks", () => {
      const event: BillingEvent = {
        type: "integrity.latest",
        userId: "user-123",
        success: true,
      };

      expect(shouldBill(event)).toBe(false);
    });

    it("should not bill for health checks", () => {
      const event: BillingEvent = {
        type: "integrity.health",
        userId: "user-123",
        success: true,
      };

      expect(shouldBill(event)).toBe(false);
    });

    it("should not bill for unknown event types", () => {
      const event: BillingEvent = {
        type: "unknown.event",
        userId: "user-123",
        success: true,
      };

      expect(shouldBill(event)).toBe(false);
    });
  });

  describe("getPricingRules", () => {
    it("should return all pricing rules", () => {
      const rules = getPricingRules();

      expect(rules).toHaveLength(5);
      expect(rules.map((r) => r.eventType)).toEqual([
        "proof.create",
        "proof.verify",
        "proof.get",
        "integrity.latest",
        "integrity.health",
      ]);
    });

    it("should have correct descriptions", () => {
      const rules = getPricingRules();

      const createRule = rules.find((r) => r.eventType === "proof.create");
      expect(createRule?.description).toBe("Bill for successful proof creation only");

      const verifyRule = rules.find((r) => r.eventType === "proof.verify");
      expect(verifyRule?.description).toBe("Verification is free");
    });
  });

  describe("getBillingSummary", () => {
    it("should calculate billing summary correctly", () => {
      const events: BillingEvent[] = [
        {
          type: "proof.create",
          userId: "user-123",
          proofId: "proof-1",
          success: true,
        },
        {
          type: "proof.create",
          userId: "user-123",
          proofId: "proof-2",
          success: true,
        },
        {
          type: "proof.create",
          userId: "user-123",
          success: false, // Failed creation
        },
        {
          type: "proof.verify",
          userId: "user-123",
          proofId: "proof-1",
          success: true,
        },
        {
          type: "proof.verify",
          userId: "user-123",
          proofId: "proof-2",
          success: true,
        },
        {
          type: "proof.get",
          userId: "user-123",
          proofId: "proof-1",
          success: true,
        },
        {
          type: "integrity.latest",
          userId: "user-123",
          success: true,
        },
      ];

      const summary = getBillingSummary(events);

      expect(summary.totalEvents).toBe(7);
      expect(summary.billableEvents).toBe(2); // Only successful proof creations
      expect(summary.freeEvents).toBe(5);
      expect(summary.billableEventTypes).toEqual(["proof.create"]);
    });

    it("should handle empty events array", () => {
      const summary = getBillingSummary([]);

      expect(summary.totalEvents).toBe(0);
      expect(summary.billableEvents).toBe(0);
      expect(summary.freeEvents).toBe(0);
      expect(summary.billableEventTypes).toEqual([]);
    });

    it("should handle only free events", () => {
      const events: BillingEvent[] = [
        {
          type: "proof.verify",
          userId: "user-123",
          proofId: "proof-1",
          success: true,
        },
        {
          type: "proof.get",
          userId: "user-123",
          proofId: "proof-1",
          success: true,
        },
      ];

      const summary = getBillingSummary(events);

      expect(summary.totalEvents).toBe(2);
      expect(summary.billableEvents).toBe(0);
      expect(summary.freeEvents).toBe(2);
      expect(summary.billableEventTypes).toEqual([]);
    });
  });

  describe("Property-based testing", () => {
    it("should never bill for verify events", () => {
      // Generate 100 random verify events
      for (let i = 0; i < 100; i++) {
        const event: BillingEvent = {
          type: "proof.verify",
          userId: `user-${i}`,
          proofId: `proof-${i}`,
          success: Math.random() > 0.5,
          ...(Math.random() > 0.5 && { metadata: { test: "data" } }),
        };

        expect(shouldBill(event)).toBe(false);
      }
    });

    it("should only bill for successful proof creation with proof ID", () => {
      // Generate 100 random proof creation events
      for (let i = 0; i < 100; i++) {
        const hasProofId = Math.random() > 0.5;
        const isSuccess = Math.random() > 0.5;

        const event: BillingEvent = {
          type: "proof.create",
          userId: `user-${i}`,
          proofId: `proof-${i}`,
          success: isSuccess,
        };

        const expectedBill = hasProofId && isSuccess;
        expect(shouldBill(event)).toBe(expectedBill);
      }
    });
  });
});
