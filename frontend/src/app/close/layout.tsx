import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Close Delivery - Veris",
  description:
    "Create a verifiable delivery record. Files are hashed locally in your browser using SHA-256 - no content is uploaded to our servers.",
  openGraph: {
    title: "Close Delivery - Veris",
    description: "Create cryptographically verifiable delivery records with local file hashing.",
    type: "website",
  },
  alternates: {
    canonical: "/close",
  },
};

export default function CloseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
