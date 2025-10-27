import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Veris - Cryptographic Proof Creator",
  description:
    "Cryptographic proof of file integrity with Ed25519 signatures. Secure, verifiable, and tamper-proof.",
  metadataBase: new URL("https://verisplatform.com"),
  openGraph: {
    title: "Veris - Verifiable Proof of Delivery",
    description:
      "Cryptographic proof of file integrity with Ed25519 signatures. Secure, verifiable, and tamper-proof.",
    type: "website",
    siteName: "Veris",
  },
  twitter: {
    card: "summary_large_image",
    title: "Veris - Verifiable Proof of Delivery",
    description: "Cryptographic proof of file integrity with Ed25519 signatures.",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
