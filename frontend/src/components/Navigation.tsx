"use client";
import Link from "next/link";

export function Navigation() {
  return (
    <nav style={{ paddingTop: "16px", paddingBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          <Link
            href="/close"
            style={{
              color: "#CBD5E1",
              textDecoration: "none",
              fontSize: "16px",
            }}
          >
            Close
          </Link>
          <Link
            href="/check"
            style={{
              color: "#CBD5E1",
              textDecoration: "none",
              fontSize: "16px",
            }}
          >
            Check
          </Link>
          <Link
            href="/billing"
            style={{
              color: "#CBD5E1",
              textDecoration: "none",
              fontSize: "16px",
            }}
          >
            Billing
          </Link>
        </div>
      </div>
    </nav>
  );
}
