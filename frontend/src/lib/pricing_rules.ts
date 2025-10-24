/**
 * Pricing rules for Veris platform
 * Defines when to bill users for different events
 */

export interface BillingEvent {
  type: string;
  userId: string;
  proofId?: string;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface PricingRule {
  eventType: string;
  shouldBill: (event: BillingEvent) => boolean;
  description: string;
}

/**
 * Check if an event should be billed
 */
export function shouldBill(event: BillingEvent): boolean {
  const rules: PricingRule[] = [
    {
      eventType: "proof.create",
      shouldBill: (event) => {
        // Only bill for successful proof creation
        return event.success && !!event.proofId;
      },
      description: "Bill for successful proof creation only",
    },
    {
      eventType: "proof.verify",
      shouldBill: () => {
        // Verification is always free
        return false;
      },
      description: "Verification is free",
    },
    {
      eventType: "proof.get",
      shouldBill: () => {
        // Getting proof details is free
        return false;
      },
      description: "Proof retrieval is free",
    },
    {
      eventType: "integrity.latest",
      shouldBill: () => {
        // Integrity checks are free
        return false;
      },
      description: "Integrity checks are free",
    },
    {
      eventType: "integrity.health",
      shouldBill: () => {
        // Health checks are free
        return false;
      },
      description: "Health checks are free",
    },
  ];

  // Find matching rule
  const rule = rules.find((r) => r.eventType === event.type);

  if (!rule) {
    // Default: don't bill for unknown events
    console.warn(`No pricing rule found for event type: ${event.type}`);
    return false;
  }

  return rule.shouldBill(event);
}

/**
 * Get all pricing rules for documentation
 */
export function getPricingRules(): PricingRule[] {
  return [
    {
      eventType: "proof.create",
      shouldBill: (event) => event.success && !!event.proofId,
      description: "Bill for successful proof creation only",
    },
    {
      eventType: "proof.verify",
      shouldBill: () => false,
      description: "Verification is free",
    },
    {
      eventType: "proof.get",
      shouldBill: () => false,
      description: "Proof retrieval is free",
    },
    {
      eventType: "integrity.latest",
      shouldBill: () => false,
      description: "Integrity checks are free",
    },
    {
      eventType: "integrity.health",
      shouldBill: () => false,
      description: "Health checks are free",
    },
  ];
}

/**
 * Get billing summary for a user
 */
export function getBillingSummary(events: BillingEvent[]): {
  totalEvents: number;
  billableEvents: number;
  freeEvents: number;
  billableEventTypes: string[];
} {
  const billableEvents = events.filter(shouldBill);
  const freeEvents = events.filter((event) => !shouldBill(event));

  const billableEventTypes = [...new Set(billableEvents.map((e) => e.type))];

  return {
    totalEvents: events.length,
    billableEvents: billableEvents.length,
    freeEvents: freeEvents.length,
    billableEventTypes,
  };
}
