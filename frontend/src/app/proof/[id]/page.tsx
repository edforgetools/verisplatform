import React, { Suspense } from 'react';
import { ProofViewer } from './ProofViewer';
import { ProofSkeleton } from './ProofSkeleton';

// Removed unused functions - they're now handled in the ProofViewer component

export default async function ProofPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
        <Suspense fallback={<ProofSkeleton />}>
          <ProofViewer proofId={id} />
        </Suspense>
      </div>
    </main>
  );
}
