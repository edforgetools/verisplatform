import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Veris - Verifiable Delivery Records",
  description:
    "A verifiable record when work is complete.",
  metadataBase: new URL("https://verisplatform.com"),
  openGraph: {
    title: "Veris - Verifiable Delivery Records",
    description:
      "Cryptographically verifiable closure for digital handoffs. Create and verify delivery records.",
    type: "website",
    siteName: "Veris",
  },
  twitter: {
    card: "summary_large_image",
    title: "Veris - Verifiable Delivery Records",
    description: "Cryptographically verifiable closure for digital handoffs.",
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
