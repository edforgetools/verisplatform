import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Billing - Veris",
  description:
    "Veris pricing preview and billing information. This public prototype does not currently have billing enabled.",
  openGraph: {
    title: "Billing - Veris",
    description: "View indicative pricing for Veris delivery verification services.",
    type: "website",
  },
  alternates: {
    canonical: "/billing",
  },
};

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
