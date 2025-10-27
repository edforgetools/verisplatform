import Link from "next/link";
import { Layout } from "@/components/Layout";

export default function Home() {
  return (
    <Layout>
      {/* Hero Section */}
      <div className="text-center mb-20">
        <h1 style={{ fontSize: "48px", fontWeight: 700, color: "#F9FAFB", marginBottom: "24px" }}>
          Verifiable Proof of Delivery
        </h1>
        <p
          style={{
            fontSize: "18px",
            color: "#CBD5E1",
            marginBottom: "32px",
            maxWidth: "960px",
            margin: "0 auto 32px",
          }}
        >
          Cryptographically verifiable proof of file integrity using Ed25519 signatures.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/demo"
            style={{
              padding: "12px 32px",
              backgroundColor: "#00B67A",
              color: "white",
              borderRadius: "0.75rem",
              fontWeight: 500,
              textDecoration: "none",
              display: "inline-block",
              height: "44px",
            }}
          >
            Create Proof
          </Link>
          <Link
            href="/verify"
            style={{
              padding: "12px 32px",
              backgroundColor: "#162133",
              color: "#CBD5E1",
              borderRadius: "0.75rem",
              fontWeight: 500,
              textDecoration: "none",
              display: "inline-block",
              height: "44px",
            }}
          >
            Verify
          </Link>
        </div>
      </div>

      {/* Three-step explainer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4"
            style={{ backgroundColor: "#162133" }}
          >
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ color: "#00B67A", fontSize: "32px" }}
            >
              1
            </div>
          </div>
          <h3 style={{ fontSize: "20px", fontWeight: 600, color: "#E5E7EB", marginBottom: "8px" }}>
            Create Proof
          </h3>
          <p style={{ fontSize: "18px", color: "#CBD5E1" }}>
            Upload your file. Compute a SHA-256 hash and sign it with Ed25519.
          </p>
        </div>

        <div className="text-center">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4"
            style={{ backgroundColor: "#162133" }}
          >
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ color: "#00B67A", fontSize: "32px" }}
            >
              2
            </div>
          </div>
          <h3 style={{ fontSize: "20px", fontWeight: 600, color: "#E5E7EB", marginBottom: "8px" }}>
            Register
          </h3>
          <p style={{ fontSize: "18px", color: "#CBD5E1" }}>
            Your proof is stored in our append-only registry with a unique ULID and timestamp.
          </p>
        </div>

        <div className="text-center">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4"
            style={{ backgroundColor: "#162133" }}
          >
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ color: "#00B67A", fontSize: "32px" }}
            >
              3
            </div>
          </div>
          <h3 style={{ fontSize: "20px", fontWeight: 600, color: "#E5E7EB", marginBottom: "8px" }}>
            Verify
          </h3>
          <p style={{ fontSize: "18px", color: "#CBD5E1" }}>
            Verify file integrity anytime. Free, public verification API.
          </p>
        </div>
      </div>

      {/* Footer Replacement */}
      <div
        style={{
          backgroundColor: "#162133",
          padding: "48px 24px",
          borderRadius: "0.75rem",
          textAlign: "center",
          maxWidth: "960px",
          margin: "0 auto",
        }}
      >
        <h2 style={{ fontSize: "24px", fontWeight: 600, color: "#E5E7EB", marginBottom: "16px" }}>
          About this MVP
        </h2>
        <p style={{ fontSize: "18px", color: "#CBD5E1", maxWidth: "800px", margin: "0 auto" }}>
          Veris is a public proof-of-concept that demonstrates verifiable digital delivery. Proofs
          created here are for evaluation only and may be purged periodically. Verification is free
          and public.
        </p>
      </div>
    </Layout>
  );
}
