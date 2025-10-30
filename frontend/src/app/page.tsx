import Link from "next/link";
import { Layout } from "@/components/Layout";

// A/B test variants for headlines
const HEADLINE_VARIANTS = {
  a: {
    h1: "Proof of Delivery, verifiable.",
    subtitle:
      "Hash, timestamp, and sign every delivery. Capture acceptance. Export evidence for banks and platforms.",
  },
  b: {
    h1: "Verifiable proof you delivered, exactly.",
    subtitle:
      "Hash, timestamp, and sign every delivery. Capture acceptance. Export evidence for banks and platforms.",
  },
};

export default function Home() {
  // Select variant (can use A/B test cookie or randomize)
  const variant = HEADLINE_VARIANTS.a; // or .b

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4">
        {/* Hero block - pt-10 md:pt-14, max-width 68ch */}
        <section className="text-center pt-10 md:pt-14" aria-labelledby="hero-heading">
          <h1
            id="hero-heading"
            className="text-5xl font-bold text-white leading-tight"
            style={{ maxWidth: "68ch", margin: "0 auto" }}
          >
            {variant.h1}
          </h1>
          <p
            className="text-lg mt-3 leading-relaxed"
            style={{ color: "#E6EDF7", maxWidth: "68ch", margin: "0.75rem auto 0" }}
          >
            {variant.subtitle}
          </p>
          <div
            className="mt-6 flex flex-wrap gap-3 justify-center"
            role="group"
            aria-label="Primary actions"
          >
            <Link
              href="/close"
              className="btn-primary"
              aria-label="Navigate to close delivery page"
            >
              Create proof + request sign-off
            </Link>
            <Link
              href="/check"
              className="btn-secondary"
              aria-label="Navigate to check delivery page"
            >
              Verify a file
            </Link>
          </div>
        </section>

        {/* Trust Explainer Bullets */}
        <section className="mt-16 grid md:grid-cols-3 gap-6 mb-12">
          <div className="text-center">
            <h3 className="font-semibold mb-2" style={{ color: "#E6EDF7" }}>
              Hash the file
            </h3>
            <p className="text-sm" style={{ color: "#E6EDF7" }}>
              SHA-256 creates unique fingerprint
            </p>
          </div>
          <div className="text-center">
            <h3 className="font-semibold mb-2" style={{ color: "#E6EDF7" }}>
              Timestamp the proof
            </h3>
            <p className="text-sm" style={{ color: "#E6EDF7" }}>
              Cryptographically signed with Ed25519
            </p>
          </div>
          <div className="text-center">
            <h3 className="font-semibold mb-2" style={{ color: "#E6EDF7" }}>
              Link to exact version
            </h3>
            <p className="text-sm" style={{ color: "#E6EDF7" }}>
              No ambiguity about what was delivered
            </p>
          </div>
          <div className="text-center">
            <h3 className="font-semibold mb-2" style={{ color: "#E6EDF7" }}>
              Record acceptance
            </h3>
            <p className="text-sm" style={{ color: "#E6EDF7" }}>
              Capture recipient sign-off with IP and timestamp
            </p>
          </div>
          <div className="text-center">
            <h3 className="font-semibold mb-2" style={{ color: "#E6EDF7" }}>
              Verify anywhere
            </h3>
            <p className="text-sm" style={{ color: "#E6EDF7" }}>
              Works even if metadata is stripped
            </p>
          </div>
          <div className="text-center">
            <h3 className="font-semibold mb-2" style={{ color: "#E6EDF7" }}>
              Optional Content Credentials
            </h3>
            <p className="text-sm" style={{ color: "#E6EDF7" }}>
              Always verifiable by hash
            </p>
          </div>
        </section>

        {/* Objection Handling Section */}
        <section className="mt-16 card p-8 rounded-lg">
          <h2 className="text-2xl font-bold mb-6" style={{ color: "#E6EDF7" }}>
            Common Questions
          </h2>

          <div className="space-y-4">
            <details className="cursor-pointer">
              <summary className="font-semibold" style={{ color: "#E6EDF7" }}>
                Will this help with chargebacks?
              </summary>
              <p className="mt-2 text-sm" style={{ color: "#E6EDF7" }}>
                Yes. Evidence packs export in formats aligned to card-network guidelines (Stripe,
                PayPal). Shows clear proof of delivery and acceptance.
              </p>
            </details>

            <details className="cursor-pointer">
              <summary className="font-semibold" style={{ color: "#E6EDF7" }}>
                What if metadata is stripped?
              </summary>
              <p className="mt-2 text-sm" style={{ color: "#E6EDF7" }}>
                Hash verification works even without metadata. We use SHA-256 content hashing, not
                file metadata. Your proof remains verifiable regardless of file transformations.
              </p>
            </details>

            <details className="cursor-pointer">
              <summary className="font-semibold" style={{ color: "#E6EDF7" }}>
                Is acceptance legally clear?
              </summary>
              <p className="mt-2 text-sm" style={{ color: "#E6EDF7" }}>
                Yes. Recipient explicitly accepts the exact file hash and timestamp. We record IP
                address, user agent, and exact acceptance time for dispute evidence.
              </p>
            </details>

            <details className="cursor-pointer">
              <summary className="font-semibold" style={{ color: "#E6EDF7" }}>
                How is this different from Content Credentials?
              </summary>
              <p className="mt-2 text-sm" style={{ color: "#E6EDF7" }}>
                Content Credentials (C2PA) are optional enhancement. Our core verification uses
                SHA-256 + Ed25519, which works even if C2PA metadata is stripped. We support both
                approaches.
              </p>
            </details>
          </div>
        </section>
      </div>
    </Layout>
  );
}
