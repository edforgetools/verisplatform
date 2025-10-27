import Link from "next/link";
import { Layout } from "@/components/Layout";

export default function Home() {
  return (
    <Layout>
      {/* Hero Section */}
      <div className="text-center" style={{ paddingTop: "120px", marginBottom: "64px" }}>
        <p
          style={{
            fontSize: "18px",
            color: "#CBD5E1",
            marginBottom: "24px",
            maxWidth: "960px",
            margin: "0 auto 24px",
          }}
        >
          When work is done, Veris records the moment of completion.
        </p>
        <h1 style={{ fontSize: "48px", fontWeight: 700, color: "#F9FAFB", marginBottom: "12px" }}>
          Verifiable Delivery Records
        </h1>
        <p
          style={{
            fontSize: "18px",
            color: "#CBD5E1",
            marginBottom: "16px",
            maxWidth: "960px",
            margin: "0 auto 16px",
          }}
        >
          A verifiable record when work is complete.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/close"
            className="flex items-center justify-center"
            style={{
              padding: "12px 32px",
              backgroundColor: "#00B67A",
              color: "white",
              borderRadius: "0.75rem",
              fontWeight: 500,
              textDecoration: "none",
              height: "44px",
            }}
          >
            Close Delivery
          </Link>
          <Link
            href="/check"
            className="flex items-center justify-center"
            style={{
              padding: "12px 32px",
              backgroundColor: "#162133",
              color: "#CBD5E1",
              borderRadius: "0.75rem",
              fontWeight: 500,
              textDecoration: "none",
              border: "1px solid #1E293B",
              height: "44px",
            }}
          >
            Check Delivery
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
            Close Delivery
          </h3>
          <p style={{ fontSize: "18px", color: "#CBD5E1" }}>Upload file to create a record.</p>
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
            Record Closure
          </h3>
          <p style={{ fontSize: "18px", color: "#CBD5E1" }}>Immutable ULID + timestamp.</p>
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
            Check Delivery
          </h3>
          <p style={{ fontSize: "18px", color: "#CBD5E1" }}>Verify anytime, publicly.</p>
        </div>
      </div>

      {/* Footer */}
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
          Veris is a public proof‑of‑concept that demonstrates verifiable closure of digital
          deliveries. Records here are temporary and may be purged. Checking deliveries is free and
          public.
        </p>
      </div>
    </Layout>
  );
}
