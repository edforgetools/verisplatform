import Link from "next/link";
import { Layout } from "@/components/Layout";

export default function Home() {
  return (
    <Layout>
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 16px" }}>
        {/* Hero block (compressed) - mt-24 from Top Bar */}
        <div
          className="text-center"
          style={{
            marginTop: "96px",
          }}
        >
          <p
            style={{
              fontSize: "18px",
              color: "#CBD5E1",
              marginBottom: "8px",
              lineHeight: "1.6",
            }}
          >
            When work is done, Veris records the moment of completion.
          </p>
          <h1
            style={{
              fontSize: "48px",
              fontWeight: 700,
              color: "#F9FAFB",
              marginTop: "8px",
              lineHeight: "1.2",
            }}
          >
            Verifiable Delivery Records
          </h1>
          <p
            style={{
              fontSize: "18px",
              color: "#CBD5E1",
              marginTop: "12px",
              lineHeight: "1.6",
            }}
          >
            A verifiable record when work is complete.
          </p>
          <div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            style={{ marginTop: "16px" }}
          >
            <Link
              href="/close"
              className="flex items-center justify-center h-10 md:h-11 px-5 md:px-6 text-base font-medium leading-none"
              style={{
                backgroundColor: "#00B67A",
                color: "white",
                borderRadius: "0.75rem",
                textDecoration: "none",
              }}
            >
              Close Delivery
            </Link>
            <Link
              href="/check"
              className="flex items-center justify-center h-10 md:h-11 px-5 md:px-6 text-base font-medium leading-none"
              style={{
                backgroundColor: "#162133",
                color: "#CBD5E1",
                borderRadius: "0.75rem",
                textDecoration: "none",
                border: "1px solid #1E293B",
              }}
            >
              Check Delivery
            </Link>
          </div>
        </div>

        {/* Steps row - mt-24 from CTAs, gap-24 between items */}
        <div
          className="flex flex-col md:flex-row justify-center items-center"
          style={{ marginTop: "96px", gap: "96px" }}
        >
          <div className="text-center">
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#162133",
                margin: "0 auto 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ color: "#00B67A", fontSize: "24px" }}>1</div>
            </div>
            <h3
              style={{ fontSize: "18px", fontWeight: 600, color: "#E5E7EB", marginBottom: "4px" }}
            >
              Close Delivery
            </h3>
          </div>

          <div className="text-center">
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#162133",
                margin: "0 auto 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ color: "#00B67A", fontSize: "24px" }}>2</div>
            </div>
            <h3
              style={{ fontSize: "18px", fontWeight: 600, color: "#E5E7EB", marginBottom: "4px" }}
            >
              Record Closure
            </h3>
          </div>

          <div className="text-center">
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#162133",
                margin: "0 auto 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ color: "#00B67A", fontSize: "24px" }}>3</div>
            </div>
            <h3
              style={{ fontSize: "18px", fontWeight: 600, color: "#E5E7EB", marginBottom: "4px" }}
            >
              Check Delivery
            </h3>
          </div>
        </div>

        {/* Composite About+FAQ card - mt-24 from steps */}
        <div
          style={{
            backgroundColor: "#162133",
            padding: "32px",
            borderRadius: "0.75rem",
            border: "1px solid #1E293B",
            textAlign: "center",
            marginTop: "96px",
            marginBottom: "32px",
          }}
        >
          <h2 style={{ fontSize: "24px", fontWeight: 600, color: "#E5E7EB", marginBottom: "16px" }}>
            About this MVP
          </h2>
          <p
            style={{
              fontSize: "18px",
              color: "#CBD5E1",
              maxWidth: "800px",
              margin: "0 auto",
              lineHeight: "1.6",
            }}
          >
            Veris is a public proof‑of‑concept that demonstrates verifiable closure of digital
            deliveries. Records here are temporary and may be purged. Checking deliveries is free
            and public.
          </p>

          {/* Divider inside card */}
          <div
            style={{
              borderTop: "1px solid #1E293B",
              marginTop: "24px",
              paddingTop: "24px",
            }}
          >
            <h3
              style={{ fontSize: "18px", fontWeight: 600, color: "#E5E7EB", marginBottom: "12px" }}
            >
              Micro FAQ
            </h3>
            <div style={{ textAlign: "left", maxWidth: "700px", margin: "0 auto" }}>
              <div style={{ marginBottom: "16px" }}>
                <h4
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#E5E7EB",
                    marginBottom: "4px",
                  }}
                >
                  What does Close Delivery do?
                </h4>
                <p style={{ fontSize: "14px", color: "#CBD5E1", lineHeight: "1.6" }}>
                  Creates a verifiable record of completion.
                </p>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <h4
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#E5E7EB",
                    marginBottom: "4px",
                  }}
                >
                  Is my file uploaded?
                </h4>
                <p style={{ fontSize: "14px", color: "#CBD5E1", lineHeight: "1.6" }}>
                  No, only a local hash is stored.
                </p>
              </div>
              <div>
                <h4
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#E5E7EB",
                    marginBottom: "4px",
                  }}
                >
                  How long do records last?
                </h4>
                <p style={{ fontSize: "14px", color: "#CBD5E1", lineHeight: "1.6" }}>
                  Seven days in this public prototype.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
