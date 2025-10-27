import Link from "next/link";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(to bottom, #0e1726, #101828)" }}
    >
      <div className="max-w-5xl mx-auto px-4">
        {/* Unified Top Bar (header + banner) - 64px height */}
        <div style={{ height: "64px", borderBottom: "1px solid #1E293B" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              height: "100%",
              paddingLeft: "16px",
              paddingRight: "16px",
            }}
          >
            <div>
              <Link
                href="/"
                style={{
                  fontSize: "20px",
                  fontWeight: 600,
                  color: "#F9FAFB",
                  textDecoration: "none",
                }}
              >
                Veris
              </Link>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "24px",
                flex: 1,
                justifyContent: "center",
                fontSize: "12px",
                color: "#94A3B8",
              }}
            >
              Public prototype — for evaluation only.
            </div>
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
              <Link
                href="/close"
                style={{
                  color: "#CBD5E1",
                  textDecoration: "none",
                  fontSize: "14px",
                }}
              >
                Close
              </Link>
              <Link
                href="/check"
                style={{
                  color: "#CBD5E1",
                  textDecoration: "none",
                  fontSize: "14px",
                }}
              >
                Check
              </Link>
              <Link
                href="/billing"
                style={{
                  color: "#CBD5E1",
                  textDecoration: "none",
                  fontSize: "14px",
                }}
              >
                Billing
              </Link>
            </div>
          </div>
        </div>

        <main>{children}</main>

        {/* Footer */}
        <footer
          style={{
            paddingTop: "64px",
            paddingBottom: "32px",
            textAlign: "center",
            fontSize: "16px",
            color: "#CBD5E1",
            borderTop: "1px solid #1E293B",
            marginTop: "32px",
          }}
        >
          support@verisplatform.com
        </footer>
      </div>
    </div>
  );
}
