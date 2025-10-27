import { Navigation } from "./Navigation";

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
        <Navigation />
        <div
          style={{
            backgroundColor: "#162133",
            borderBottom: "1px solid #1E293B",
            padding: "12px 16px",
            textAlign: "center",
            fontSize: "14px",
            color: "#CBD5E1",
          }}
        >
          Public prototype — for evaluation only.
        </div>
        <main style={{ paddingTop: "48px", paddingBottom: "48px" }}>{children}</main>
      </div>
    </div>
  );
}
