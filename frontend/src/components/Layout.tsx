import Link from "next/link";
import { Footer } from "./footer";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0B1220" }}>
      <div className="max-w-5xl mx-auto px-4 flex-1 flex flex-col w-full">
        {/* Header with navigation landmark */}
        <header
          className="h-16 border-b"
          style={{ borderColor: "rgba(255, 255, 255, 0.12)" }}
          role="banner"
        >
          <div className="flex justify-between items-center h-full px-4">
            <div>
              <Link
                href="/"
                className="text-xl font-semibold text-white no-underline"
                aria-label="Veris home"
              >
                Veris
              </Link>
            </div>
            <div
              className="flex items-center gap-6 flex-1 justify-center text-xs"
              style={{ color: "#98A2B3" }}
              role="status"
              aria-label="Application status"
            >
              Public prototype — for evaluation only.
            </div>
            <nav className="flex gap-3 items-center text-sm" aria-label="Main navigation">
              <Link
                href="/close"
                className="no-underline"
                style={{ color: "#E6EDF7" }}
                aria-label="Close delivery"
              >
                Close
              </Link>
              <span style={{ color: "#98A2B3" }} aria-hidden="true">
                ·
              </span>
              <Link
                href="/check"
                className="no-underline"
                style={{ color: "#E6EDF7" }}
                aria-label="Check delivery"
              >
                Check
              </Link>
              <span style={{ color: "#98A2B3" }} aria-hidden="true">
                ·
              </span>
              <Link
                href="/billing"
                className="no-underline"
                style={{ color: "#E6EDF7" }}
                aria-label="Billing information"
              >
                Billing
              </Link>
            </nav>
          </div>
        </header>

        <main id="main" className="flex-1" role="main">
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
}
