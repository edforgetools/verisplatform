import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Veris - Cryptographic Proof Creator',
  description: 'Create and verify cryptographic proofs of file integrity',
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
