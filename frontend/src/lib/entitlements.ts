import { supabaseAdmin } from './supabaseAdmin';
import { Billing } from './db-types';

export type Feature =
  | 'create_proof'
  | 'generate_certificate'
  | 'telemetry_tracking'
  | 'create_checkout';

export type Tier = 'free' | 'pro' | 'team';

export interface EntitlementConfig {
  [key: string]: {
    [tier in Tier]: boolean;
  };
}

// Define which features are available for each tier
export const ENTITLEMENT_CONFIG: EntitlementConfig = {
  create_proof: {
    free: true, // Free tier can create proofs
    pro: true, // Pro tier can create proofs
    team: true, // Team tier can create proofs
  },
  generate_certificate: {
    free: false, // Free tier cannot generate certificates
    pro: true, // Pro tier can generate certificates
    team: true, // Team tier can generate certificates
  },
  telemetry_tracking: {
    free: true, // Free tier can track telemetry
    pro: true, // Pro tier can track telemetry
    team: true, // Team tier can track telemetry
  },
  create_checkout: {
    free: true, // Free tier can create checkout (to upgrade)
    pro: true, // Pro tier can create checkout
    team: true, // Team tier can create checkout
  },
};

/**
 * Checks if a user is entitled to use a specific feature based on their billing tier
 * @param userId - The user's UUID
 * @param feature - The feature to check entitlement for
 * @returns Promise<boolean> - True if user is entitled, false otherwise
 */
export async function isEntitled(
  userId: string,
  feature: Feature,
): Promise<boolean> {
  try {
    // Get user's billing information
    const { data: billing, error } = await supabaseAdmin()
      .from('billing')
      .select('tier, status')
      .eq('user_id', userId)
      .single();

    if (error || !billing) {
      // If no billing record exists, assume free tier
      const tier: Tier = 'free';
      return ENTITLEMENT_CONFIG[feature]?.[tier] ?? false;
    }

    // Check if subscription is active
    const isActive =
      billing.status === 'active' || billing.status === 'trialing';
    if (!isActive && billing.tier !== 'free') {
      // If subscription is not active and not free tier, deny access
      return false;
    }

    const tier = (billing.tier as Tier) || 'free';
    return ENTITLEMENT_CONFIG[feature]?.[tier] ?? false;
  } catch (error) {
    console.error('Error checking entitlement:', error);
    // On error, default to denying access for security
    return false;
  }
}

/**
 * Asserts that a user is entitled to use a specific feature
 * Throws an error if the user is not entitled
 * @param userId - The user's UUID
 * @param feature - The feature to check entitlement for
 * @throws Error if user is not entitled
 */
export async function assertEntitled(
  userId: string,
  feature: Feature,
): Promise<void> {
  const entitled = await isEntitled(userId, feature);
  if (!entitled) {
    throw new Error(
      `User ${userId} is not entitled to use feature: ${feature}`,
    );
  }
}

/**
 * Gets the user's current billing tier
 * @param userId - The user's UUID
 * @returns Promise<Tier> - The user's current tier
 */
export async function getUserTier(userId: string): Promise<Tier> {
  try {
    const { data: billing, error } = await supabaseAdmin()
      .from('billing')
      .select('tier, status')
      .eq('user_id', userId)
      .single();

    if (error || !billing) {
      return 'free';
    }

    // Check if subscription is active
    const isActive =
      billing.status === 'active' || billing.status === 'trialing';
    if (!isActive && billing.tier !== 'free') {
      // If subscription is not active and not free tier, fall back to free
      return 'free';
    }

    return (billing.tier as Tier) || 'free';
  } catch (error) {
    console.error('Error getting user tier:', error);
    return 'free';
  }
}

/**
 * Gets detailed billing information for a user
 * @param userId - The user's UUID
 * @returns Promise<Billing | null> - The user's billing information
 */
export async function getUserBilling(userId: string): Promise<Billing | null> {
  try {
    const { data: billing, error } = await supabaseAdmin()
      .from('billing')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !billing) {
      return null;
    }

    return billing;
  } catch (error) {
    console.error('Error getting user billing:', error);
    return null;
  }
}
