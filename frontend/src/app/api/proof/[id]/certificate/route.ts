import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/db";
import PDFDocument from "pdfkit";
import { assertEntitled } from "@/lib/entitlements";
import { getKeyFingerprint, verifySignature } from "@/lib/crypto-server";
import { formatKeyFingerprint } from "@/lib/crypto-client";
import QRCode from "qrcode";
import { capture } from "@/lib/observability";
import { jsonErr } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const svc = supabaseService();
    const { data: proof, error } = await svc.from("proofs").select("*").eq("id", id).single();
    if (error) return jsonErr("NOT_FOUND", error.message, "certificate", 404);

    // Check entitlement for generating certificates
    try {
      await assertEntitled(proof.user_id, "generate_certificate");
    } catch {
      return jsonErr(
        "AUTH_ERROR",
        "Insufficient permissions to generate certificates",
        "certificate",
        403,
      );
    }

    // Generate verification result
    const verificationResult = verifySignature(proof.hash_full, proof.signature);

    // Get key fingerprint
    const keyFingerprint = getKeyFingerprint();
    const formattedFingerprint = keyFingerprint ? formatKeyFingerprint(keyFingerprint) : "Unknown";

    // Generate QR code for public proof page
    const publicProofUrl = `${req.nextUrl.origin}/proof/${proof.id}`;
    const qrCodeDataUrl = await QRCode.toDataURL(publicProofUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    // Create PDF document with deterministic settings
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      // Ensure deterministic output by setting consistent metadata
      info: {
        Title: `Veris Proof Certificate - ${proof.file_name}`,
        Author: "Veris",
        Subject: "Cryptographic Proof Certificate",
        Keywords: "veris, proof, certificate, cryptographic",
        Creator: "Veris",
        Producer: "Veris",
        CreationDate: new Date(proof.created_at || proof.timestamp),
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    const done = new Promise<Buffer>((res) => doc.on("end", () => res(Buffer.concat(chunks))));

    // Header
    doc.fontSize(24).font("Helvetica-Bold").text("Veris Proof Certificate", { align: "center" });
    doc.moveDown(1.5);

    // Certificate content with proper formatting
    doc.fontSize(14).font("Helvetica-Bold").text("Proof Information:", 50, doc.y);
    doc.moveDown(0.5);

    doc.fontSize(12).font("Helvetica").text(`File Name: ${proof.file_name}`);
    doc.text(`Version: ${proof.version || "1"}`);
    doc.text(`Full Hash: ${proof.hash_full}`);
    doc.text(`Short Hash: ${proof.hash_prefix}`);
    doc.text(`Sealed: ${new Date(proof.timestamp).toUTCString()}`);
    if (proof.project) {
      doc.text(`Project: ${proof.project}`);
    }
    doc.moveDown(1);

    // Certificate metadata
    doc.fontSize(14).font("Helvetica-Bold").text("Certificate Metadata:", 50, doc.y);
    doc.moveDown(0.5);

    doc.fontSize(12).font("Helvetica").text(`Issuer: Veris`);
    doc.text(`Public Key Fingerprint: ${formattedFingerprint}`);
    doc.text(`Verification Result: ${verificationResult ? "VERIFIED" : "FAILED"}`);
    doc.text(
      `Certificate Generated: ${new Date(proof.created_at || proof.timestamp).toUTCString()}`,
    );
    doc.moveDown(1);

    // Signature section
    doc.fontSize(14).font("Helvetica-Bold").text("Digital Signature:", 50, doc.y);
    doc.moveDown(0.5);

    doc.fontSize(10).font("Helvetica").text(proof.signature, {
      width: 500,
      align: "left",
    });
    doc.moveDown(1);

    // QR Code section
    doc.fontSize(14).font("Helvetica-Bold").text("Verify Online:", 50, doc.y);
    doc.moveDown(0.5);

    // Convert data URL to buffer for PDFKit
    const qrCodeBuffer = Buffer.from(qrCodeDataUrl.split(",")[1], "base64");

    // Add QR code image
    doc.image(qrCodeBuffer, 50, doc.y, { width: 120, height: 120 });

    // Add URL text below QR code
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(publicProofUrl, 180, doc.y - 80, {
        width: 300,
        align: "left",
      });

    // Footer
    doc.moveDown(2);
    doc
      .fontSize(10)
      .font("Helvetica")
      .text("This certificate provides cryptographic proof of file integrity.", 50, doc.y, {
        width: 500,
        align: "center",
      });
    doc.text(
      "Visit the URL above or scan the QR code to verify this proof online.",
      50,
      doc.y + 15,
      {
        width: 500,
        align: "center",
      },
    );

    doc.end();

    const pdf = await done;
    return new NextResponse(pdf as BodyInit, {
      status: 200,
      headers: { "Content-Type": "application/pdf" },
    });
  } catch (error) {
    capture(error, { route: "/api/proof/[id]/certificate" });
    return jsonErr("INTERNAL_ERROR", "Internal server error", "certificate", 500);
  }
}
