import React, { Suspense } from "react";
import { ProofViewer } from "./ProofViewer";
import { ProofSkeleton } from "./ProofSkeleton";
import { Layout } from "@/components/Layout";

// Removed unused functions - they're now handled in the ProofViewer component

export default async function ProofPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Layout>
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <Suspense fallback={<ProofSkeleton />}>
            <ProofViewer proofId={id} />
          </Suspense>
        </div>
      </main>
    </Layout>
  );
}
