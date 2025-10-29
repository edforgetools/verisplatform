import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Check Delivery - Veris",
  description:
    "Verify delivery records using file upload, JSON paste, or record ID lookup. Free cryptographic verification for all delivery records.",
  openGraph: {
    title: "Check Delivery - Veris",
    description: "Verify cryptographically signed delivery records instantly and for free.",
    type: "website",
  },
  alternates: {
    canonical: "/check",
  },
};

export default function CheckLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
