import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Veris - Verifiable Delivery Records",
  description:
    "Create cryptographically verifiable delivery records. Hash files locally, generate tamper-proof proofs, and verify delivery completion anytime.",
  metadataBase: new URL("https://verisplatform.com"),
  openGraph: {
    title: "Veris - Verifiable Delivery Records",
    description:
      "Cryptographically verifiable closure for digital handoffs. Create and verify delivery records with SHA-256 hashing and digital signatures.",
    type: "website",
    siteName: "Veris",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Veris - Verifiable Delivery Records",
    description:
      "Create and verify cryptographically signed delivery records. Free public prototype.",
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  keywords: [
    "delivery verification",
    "proof of delivery",
    "cryptographic records",
    "SHA-256",
    "digital signature",
    "verifiable records",
  ],
};

// Separate viewport export (Next.js 15 requirement)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <a href="#main" className="skip-link sr-only focus:not-sr-only">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
