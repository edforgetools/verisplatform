import { NextRequest, NextResponse } from "next/server";
import { streamFileToTmp, cleanupTmpFile } from "@/lib/file-upload";
import { createCanonicalProof } from "@/lib/proof-schema";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * POST /api/close - Create a delivery record (MVP v1.7)
 *
 * Accepts a file upload, hashes it locally, and creates a canonical proof.
 * Returns the proof in the canonical schema format.
 */
export async function POST(req: NextRequest) {
  let tmpPath: string | null = null;

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    // Stream file and compute hash
    const { tmpPath: fileTmpPath, hashFull } = await streamFileToTmp(file);
    tmpPath = fileTmpPath;

    // Create canonical proof per MVP v1.7 §5
    const proof = createCanonicalProof(hashFull);

    // Return the proof in the response
    return NextResponse.json({
      url: `/proof/${proof.proof_id}`,
      proof_json: proof,
    });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        route: "/api/close",
      },
      "Error creating delivery record",
    );

    return NextResponse.json({ error: "Failed to create delivery record" }, { status: 500 });
  } finally {
    // Clean up temporary file if it was created
    if (tmpPath) {
      cleanupTmpFile(tmpPath);
    }
  }
}
