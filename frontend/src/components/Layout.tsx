import Link from "next/link";
import { Footer } from "./footer";

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
        <div className="h-16 border-b border-slate-800">
          <div className="flex justify-between items-center h-full px-4">
            <div>
              <Link href="/" className="text-xl font-semibold text-white no-underline">
                Veris
              </Link>
            </div>
            <div className="flex items-center gap-6 flex-1 justify-center text-xs text-slate-500">
              Public prototype — for evaluation only.
            </div>
            <div className="flex gap-3 items-center text-sm">
              <Link href="/close" className="text-slate-300 no-underline">
                Close
              </Link>
              <span className="text-slate-500">·</span>
              <Link href="/check" className="text-slate-300 no-underline">
                Check
              </Link>
              <span className="text-slate-500">·</span>
              <Link href="/billing" className="text-slate-300 no-underline">
                Billing
              </Link>
            </div>
          </div>
        </div>

        <main>{children}</main>

        <Footer />
      </div>
    </div>
  );
}
