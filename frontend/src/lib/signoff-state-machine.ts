import { AcceptanceState, StateTransition } from "@/types/evidence-pack";
import { SupabaseClient } from "@supabase/supabase-js";

// Valid state transitions
const VALID_TRANSITIONS: Record<AcceptanceState, AcceptanceState[]> = {
  draft: ["issued"],
  issued: ["sent"],
  sent: ["viewed_no_action", "accepted", "declined", "expired"],
  viewed_no_action: ["accepted", "declined", "expired"],
  accepted: [], // Terminal state
  declined: [], // Terminal state
  expired: [], // Terminal state
};

export function isValidTransition(from: AcceptanceState, to: AcceptanceState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function validateTransition(transition: StateTransition): void {
  if (!isValidTransition(transition.from, transition.to)) {
    throw new Error(`Invalid state transition: ${transition.from} -> ${transition.to}`);
  }
}

export async function recordStateTransition(
  db: SupabaseClient,
  proofId: string,
  transition: StateTransition,
): Promise<void> {
  validateTransition(transition);

  // Insert into state log
  const { error: logError } = await db.from("acceptance_state_log").insert({
    proof_id: proofId,
    from_state: transition.from,
    to_state: transition.to,
    actor_ip: transition.actorIp,
    actor_user_agent: transition.actorUserAgent,
    notes: transition.notes,
  });

  if (logError) throw logError;

  // Update proof status
  const updateData: Record<string, string | Date | null> = {
    acceptance_status: transition.to,
  };

  if (transition.to === "sent") updateData.sent_at = new Date().toISOString();
  if (transition.to === "viewed_no_action") updateData.viewed_at = new Date().toISOString();
  if (transition.to === "accepted") {
    updateData.accepted_at = new Date().toISOString();
    updateData.accepted_by_ip = transition.actorIp || null;
    updateData.accepted_by_user_agent = transition.actorUserAgent || null;
  }
  if (transition.to === "declined") {
    updateData.declined_at = new Date().toISOString();
    updateData.declined_reason = transition.notes || null;
  }
  if (transition.to === "expired") updateData.expired_at = new Date().toISOString();

  const { error: updateError } = await db.from("proofs").update(updateData).eq("id", proofId);

  if (updateError) throw updateError;
}

// Helper function to get current state
export async function getCurrentState(
  db: SupabaseClient,
  proofId: string,
): Promise<AcceptanceState | null> {
  const { data, error } = await db
    .from("proofs")
    .select("acceptance_status")
    .eq("id", proofId)
    .single();

  if (error || !data) return null;
  return data.acceptance_status as AcceptanceState;
}

// Helper function to get state history
export async function getStateHistory(
  db: SupabaseClient,
  proofId: string,
): Promise<Record<string, unknown>[]> {
  const { data, error } = await db
    .from("acceptance_state_log")
    .select("*")
    .eq("proof_id", proofId)
    .order("timestamp", { ascending: true });

  if (error) throw error;
  return data || [];
}
