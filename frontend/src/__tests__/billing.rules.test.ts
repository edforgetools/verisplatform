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
        proofId: "proof-456",
        success: false,
      };

      expect(shouldBill(event)).toBe(false);
    });

    it("should not bill for proof verification (verification is free)", () => {
      const event: BillingEvent = {
        type: "proof.verify",
        userId: "user-123",
        proofId: "proof-456",
        success: true,
      };

      expect(shouldBill(event)).toBe(false);
    });

    it("should not bill for failed proof verification", () => {
      const event: BillingEvent = {
        type: "proof.verify",
        userId: "user-123",
        proofId: "proof-456",
        success: false,
      };

      expect(shouldBill(event)).toBe(false);
    });

    it("should not bill for unknown event types", () => {
      const event: BillingEvent = {
        type: "unknown.event" as any,
        userId: "user-123",
        proofId: "proof-456",
        success: true,
      };

      expect(shouldBill(event)).toBe(false);
    });

    it("should not bill for events without proof ID", () => {
      const event: BillingEvent = {
        type: "proof.create",
        userId: "user-123",
        proofId: "",
        success: true,
      };

      expect(shouldBill(event)).toBe(false);
    });
  });

  describe("getPricingRules", () => {
    it("should return all pricing rules", () => {
      const rules = getPricingRules();
      expect(rules).toBeDefined();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);

      // Check that rules have required properties
      rules.forEach((rule) => {
        expect(rule).toHaveProperty("eventType");
        expect(rule).toHaveProperty("shouldBill");
        expect(rule).toHaveProperty("description");
        expect(typeof rule.shouldBill).toBe("function");
      });
    });

    it("should include rules for all event types", () => {
      const rules = getPricingRules();
      const eventTypes = rules.map((rule) => rule.eventType);

      expect(eventTypes).toContain("proof.create");
      expect(eventTypes).toContain("proof.verify");
      expect(eventTypes).toContain("proof.get");
      expect(eventTypes).toContain("integrity.latest");
      expect(eventTypes).toContain("integrity.health");
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
          type: "proof.verify",
          userId: "user-123",
          proofId: "proof-1",
          success: true,
        },
        {
          type: "proof.create",
          userId: "user-123",
          proofId: "proof-3",
          success: false, // Should not be billed
        },
      ];

      const summary = getBillingSummary(events);
      expect(summary).toHaveProperty("totalEvents");
      expect(summary).toHaveProperty("billableEvents");
      expect(summary).toHaveProperty("freeEvents");
      expect(summary).toHaveProperty("billableEventTypes");
      expect(summary.totalEvents).toBe(4);
      expect(summary.billableEvents).toBe(2); // Only successful proof.create events
      expect(summary.freeEvents).toBe(2); // proof.verify and failed proof.create
      expect(summary.billableEventTypes).toEqual(["proof.create"]);
    });

    it("should handle empty events array", () => {
      const summary = getBillingSummary([]);
      expect(summary.totalEvents).toBe(0);
      expect(summary.billableEvents).toBe(0);
      expect(summary.freeEvents).toBe(0);
      expect(summary.billableEventTypes).toEqual([]);
    });
  });

  describe("Property-based testing", () => {
    it("should only bill for successful proof creation with proof ID", () => {
      // Generate random test data
      for (let i = 0; i < 100; i++) {
        const hasProofId = Math.random() > 0.5;
        const isSuccess = Math.random() > 0.5;
        const eventType = Math.random() > 0.5 ? "proof.create" : "proof.verify";

        const event: BillingEvent = {
          type: eventType,
          userId: `user-${i}`,
          proofId: hasProofId ? `proof-${i}` : "",
          success: isSuccess,
          ...(Math.random() > 0.5 && { metadata: { test: "data" } }),
        };

        // Only proof.create events with success=true and proofId should be billed
        const expectedBill = eventType === "proof.create" && hasProofId && isSuccess;
        expect(shouldBill(event)).toBe(expectedBill);
      }
    });
  });
});
