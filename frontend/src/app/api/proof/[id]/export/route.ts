import { NextRequest } from "next/server";
import { jsonErr, createAuthError } from "@/lib/http";
import { supabaseService } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/auth-server";
import { getRequestId } from "@/lib/request-id";
import { capture } from "@/lib/observability";
import { generateProofReceiptPDF } from "@/lib/pdf-generator";
import { loadTemplateSync } from "@/lib/template-renderer";
import JSZip from "jszip";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(req);

  try {
    // Get authenticated user ID
    const authenticatedUserId = await getAuthenticatedUserId(req);
    if (!authenticatedUserId) {
      return createAuthError(requestId);
    }

    const { id: proofId } = await params;
    const db = supabaseService();

    // Fetch proof with all related data
    const { data: proof, error } = await db
      .from("proofs")
      .select("*, acceptance_state_log(*), proof_attachments(*)")
      .eq("id", proofId)
      .single();

    if (error || !proof) {
      return jsonErr("NOT_FOUND", "Proof not found", requestId, 404);
    }

    if (proof.user_id !== authenticatedUserId) {
      return jsonErr("UNAUTHORIZED", "Unauthorized", requestId, 403);
    }

    // Build evidence pack
    const evidencePack = {
      evidence_pack_version: "1.0.0",
      proof: {
        proof_id: proof.proof_id,
        sha256: proof.hash_full,
        issued_at: proof.timestamp,
        signature: proof.signature,
        issuer: process.env.VERIS_ISSUER || "Veris Platform",
        algorithm: "Ed25519",
      },
      delivery: {
        file_name: proof.file_name,
        delivered_at: proof.timestamp,
        delivered_by: proof.user_id, // TODO: get user email
        project_name: proof.project,
      },
      acceptance: {
        status: proof.acceptance_status,
        recipient_email: proof.recipient_email,
        accepted_at: proof.accepted_at,
        accepted_by_ip: proof.accepted_by_ip,
        accepted_by_user_agent: proof.accepted_by_user_agent,
        declined_at: proof.declined_at,
        declined_reason: proof.declined_reason,
        state_log: proof.acceptance_state_log.map((log: Record<string, unknown>) => ({
          timestamp: log.timestamp,
          from_state: log.from_state,
          to_state: log.to_state,
          actor_ip: log.actor_ip,
          actor_user_agent: log.actor_user_agent,
          notes: log.notes,
        })),
      },
      verification_instructions: {
        verify_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://verisplatform.com"}/check`,
        verify_methods: [
          {
            method: "file_upload",
            description: "Upload original file to verify hash",
            endpoint: `${
              process.env.NEXT_PUBLIC_SITE_URL || "https://verisplatform.com"
            }/api/verify`,
          },
          {
            method: "json_paste",
            description: "Paste receipt JSON for verification",
          },
          {
            method: "proof_id",
            description: "Enter proof ID for lookup",
          },
        ],
      },
    };

    // Generate ZIP
    const zip = new JSZip();

    // Add receipt.json
    zip.file("receipt.json", JSON.stringify(evidencePack, null, 2));

    // Add receipt.pdf
    const pdfBuffer = generateProofReceiptPDF({
      proof: {
        proof_id: proof.proof_id,
        sha256: proof.hash_full,
        issued_at: proof.timestamp,
        signature: proof.signature,
        issuer: process.env.VERIS_ISSUER || "Veris Platform",
      },
      delivery: evidencePack.delivery,
      acceptance: evidencePack.acceptance,
    });
    zip.file("receipt.pdf", pdfBuffer);

    // Add acceptance.log.jsonl
    const logLines = evidencePack.acceptance.state_log
      .map((log: Record<string, unknown>) => JSON.stringify(log))
      .join("\n");
    zip.file("acceptance.log.jsonl", logLines);

    // Add mapping templates
    try {
      const stripeTemplate = loadTemplateSync("mapping_stripe.json");
      const paypalTemplate = loadTemplateSync("mapping_paypal.json");
      const genericTemplate = loadTemplateSync("mapping_generic.json");

      zip.file("mapping/stripe.json", stripeTemplate);
      zip.file("mapping/paypal.json", paypalTemplate);
      zip.file("mapping/generic.json", genericTemplate);
    } catch (error) {
      console.warn("Could not load mapping templates:", error);
    }

    // Add verification instructions
    zip.file(
      "VERIFICATION_INSTRUCTIONS.txt",
      `VERIS PROOF VERIFICATION INSTRUCTIONS

This evidence pack contains cryptographically verifiable proof of delivery.

QUICK VERIFICATION:
1. Visit ${process.env.NEXT_PUBLIC_SITE_URL || "https://verisplatform.com"}/check
2. Upload the original file OR paste receipt.json
3. System will verify the SHA-256 hash and Ed25519 signature

EVIDENCE FILES:
- receipt.json: Machine-readable canonical proof
- receipt.pdf: Human-readable proof certificate
- acceptance.log.jsonl: Complete acceptance state history
- mapping/*.json: Payment processor evidence format mappings

HASH VERIFICATION (Manual):
SHA-256: ${evidencePack.proof.sha256}

To manually verify:
  sha256sum [original-file]

The output must exactly match the hash above.

SIGNATURE VERIFICATION:
Ed25519 Signature: ${evidencePack.proof.signature}
Issuer: ${evidencePack.proof.issuer}

This signature proves the hash and timestamp were issued by Veris.

ACCEPTANCE RECORD:
Status: ${evidencePack.acceptance.status}
${evidencePack.acceptance.accepted_at ? `Accepted: ${evidencePack.acceptance.accepted_at}` : ""}
${
  evidencePack.acceptance.accepted_by_ip ? `From IP: ${evidencePack.acceptance.accepted_by_ip}` : ""
}

DISPUTE USE:
See mapping/*.json for payment processor-specific evidence formatting.

Questions? support@verisplatform.com
`,
    );

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

    // Return ZIP file
    return new Response(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="veris-evidence-pack-${proofId}.zip"`,
        "x-request-id": requestId,
      },
    });
  } catch (error) {
    capture(error, { route: "/api/proof/[id]/export", requestId });
    return jsonErr("INTERNAL_ERROR", "Internal server error", requestId, 500);
  }
}
