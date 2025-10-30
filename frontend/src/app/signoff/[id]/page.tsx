"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { SignOffModal } from "@/components/SignOffModal";

export default function SignOffPage() {
  const params = useParams();
  const router = useRouter();
  const proofId = params.id as string;

  const [proof, setProof] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProof = useCallback(async () => {
    try {
      const res = await fetch(`/api/proof/${proofId}`);
      if (!res.ok) throw new Error("Proof not found");
      const data = await res.json();
      setProof(data);
    } catch (_err) {
      setError("Failed to load proof");
    } finally {
      setLoading(false);
    }
  }, [proofId]);

  useEffect(() => {
    fetchProof();
  }, [fetchProof]);

  async function handleAccept() {
    try {
      const res = await fetch("/api/proof/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proof_id: proofId,
          acceptance_confirmed: true,
        }),
      });

      if (!res.ok) throw new Error("Failed to accept");

      router.push(`/signoff/${proofId}/accepted`);
    } catch (_err) {
      alert("Failed to record acceptance. Please try again.");
    }
  }

  async function handleDecline(reason: string) {
    try {
      const res = await fetch("/api/proof/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proof_id: proofId,
          reason,
        }),
      });

      if (!res.ok) throw new Error("Failed to decline");

      router.push(`/signoff/${proofId}/declined`);
    } catch (_err) {
      alert("Failed to record decline. Please try again.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (error || !proof) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error || "Proof not found"}</p>
      </div>
    );
  }

  return (
    <SignOffModal
      _proofId={proofId}
      fileName={proof.file_name as string}
      hash={proof.hash_full as string}
      onAccept={handleAccept}
      onDecline={handleDecline}
      onClose={() => router.push("/")}
    />
  );
}
