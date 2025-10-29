"use client";
import React, { useState } from "react";
import { Layout } from "@/components/Layout";
import { SignOffModal } from "@/components/SignOffModal";

interface CloseResponse {
  url: string;
  proof_json?: Record<string, unknown>;
  [key: string]: unknown;
}

export default function ClosePage() {
  const [file, setFile] = useState<File | null>(null);
  const [res, setRes] = useState<CloseResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  // Sign-off flow state
  const [proofId, setProofId] = useState<string | null>(null);
  const [acceptanceStatus, setAcceptanceStatus] = useState<string>("draft");
  const [showSignOffModal, setShowSignOffModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [signOffUrl, setSignOffUrl] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const r = await fetch("/api/close", {
        method: "POST",
        body: fd,
      });

      const data = await r.json();
      setRes(data);
      setShowBanner(true);

      // Extract proof ID for sign-off flow
      if (data.proof_json?.proof_id) {
        setProofId(data.proof_json.proof_id as string);
      } else if (data.proof_json?.record_id) {
        setProofId(data.proof_json.record_id as string);
      }

      // Focus management for screen readers
      setTimeout(() => {
        const successBanner = document.querySelector('[role="alert"]');
        if (successBanner instanceof HTMLElement) {
          successBanner.focus();
        }
      }, 100);

      // Auto-dismiss banner after 4s
      setTimeout(() => setShowBanner(false), 4000);
    } catch (error) {
      console.error("Error creating delivery record:", error);
    } finally {
      setLoading(false);
    }
  };

  // Sign-off flow functions
  const handleIssueProof = async () => {
    if (!proofId) return;

    try {
      const response = await fetch("/api/proof/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proof_id: proofId }),
      });

      if (response.ok) {
        setAcceptanceStatus("issued");
      }
    } catch (error) {
      console.error("Error issuing proof:", error);
    }
  };

  const _handleSendSignOffRequest = async () => {
    if (!proofId || !recipientEmail) return;

    try {
      const response = await fetch("/api/proof/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proof_id: proofId,
          recipient_email: recipientEmail,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSignOffUrl(data.signoff_url);
        setAcceptanceStatus("sent");
      }
    } catch (error) {
      console.error("Error sending sign-off request:", error);
    }
  };

  const handleAcceptSignOff = async () => {
    if (!proofId) return;

    try {
      const response = await fetch("/api/proof/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proof_id: proofId,
          acceptance_confirmed: true,
        }),
      });

      if (response.ok) {
        setAcceptanceStatus("accepted");
        setShowSignOffModal(false);
      }
    } catch (error) {
      console.error("Error accepting sign-off:", error);
    }
  };

  const handleDeclineSignOff = async (reason: string) => {
    if (!proofId) return;

    try {
      const response = await fetch("/api/proof/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proof_id: proofId,
          reason,
        }),
      });

      if (response.ok) {
        setAcceptanceStatus("declined");
        setShowSignOffModal(false);
      }
    } catch (error) {
      console.error("Error declining sign-off:", error);
    }
  };

  return (
    <Layout>
      <main>
        <div className="max-w-4xl mx-auto px-4">
          <h1
            id="close-heading"
            className="text-5xl font-semibold mb-2 mt-24"
            style={{ color: "#E6EDF7" }}
          >
            Close Delivery
          </h1>
          <p className="text-lg mt-2 mb-6" style={{ color: "#E6EDF7" }}>
            Files are hashed locally. No content leaves your browser.
          </p>

          <form onSubmit={submit} className="space-y-4" aria-labelledby="close-heading">
            <div className="flex flex-col gap-4">
              <label htmlFor="file-input" className="sr-only">
                Select file to close delivery
              </label>
              <input
                id="file-input"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="input"
                aria-required="true"
                aria-describedby="file-help"
              />
              <p id="file-help" className="sr-only">
                Upload a file to create a verifiable delivery record. The file is hashed locally in
                your browser.
              </p>
              <button
                type="submit"
                disabled={loading || !file}
                className="btn-submit"
                style={{
                  background: loading || !file ? "rgba(255, 255, 255, 0.05)" : "#22C55E",
                  cursor: loading || !file ? "not-allowed" : "pointer",
                  color: loading || !file ? "#98A2B3" : "#000",
                }}
                aria-label={
                  loading ? "Closing delivery in progress" : "Close delivery and create record"
                }
                aria-live="polite"
                aria-busy={loading}
              >
                {loading ? "Closing Delivery..." : "Close Delivery"}
              </button>
            </div>
          </form>

          {res && (
            <div className="mt-4 space-y-4">
              {showBanner && (
                <div
                  role="alert"
                  tabIndex={-1}
                  className="p-4 rounded-xl border transition-opacity duration-150"
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    borderColor: "#22C55E",
                  }}
                >
                  <p className="font-medium" style={{ color: "#22C55E" }}>
                    ✅ Delivery Closed — record created at {new Date().toLocaleString()}.
                  </p>
                </div>
              )}

              {/* Sign-off Flow */}
              {proofId && (
                <div
                  className="mt-6 p-4 rounded-xl border"
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <h3 className="text-lg font-semibold mb-4" style={{ color: "#E6EDF7" }}>
                    Sign-Off Flow
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: "#E6EDF7" }}>
                        Proof ID:
                      </span>
                      <span
                        className="text-sm font-mono px-2 py-1 rounded bg-gray-800 text-green-400"
                        data-testid="proof-id"
                      >
                        {proofId}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: "#E6EDF7" }}>
                        Status:
                      </span>
                      <span className="text-sm" style={{ color: "#E6EDF7" }}>
                        {acceptanceStatus}
                      </span>
                    </div>

                    {/* Action buttons based on status */}
                    <div className="flex flex-wrap gap-3 mt-4">
                      {acceptanceStatus === "draft" && (
                        <button
                          onClick={handleIssueProof}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                          Issue Proof
                        </button>
                      )}

                      {acceptanceStatus === "issued" && (
                        <>
                          <button
                            onClick={() => setShowSignOffModal(true)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                          >
                            Send Sign-Off Request
                          </button>

                          <div className="flex items-center gap-2">
                            <input
                              type="email"
                              placeholder="Recipient email"
                              value={recipientEmail}
                              onChange={(e) => setRecipientEmail(e.target.value)}
                              className="px-3 py-2 rounded border bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                              name="recipient_email"
                            />
                          </div>
                        </>
                      )}

                      {acceptanceStatus === "sent" && signOffUrl && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium" style={{ color: "#E6EDF7" }}>
                              Sign-off URL:
                            </span>
                            <span
                              className="text-sm font-mono px-2 py-1 rounded bg-gray-800 text-blue-400"
                              data-testid="signoff-url"
                            >
                              {signOffUrl}
                            </span>
                          </div>
                          <button
                            onClick={() => window.open(signOffUrl, "_blank")}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                          >
                            Open Sign-Off Page
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {res.proof_json && (
                <div className={showBanner ? "mt-4" : ""}>
                  <div className="flex gap-3 mb-4">
                    <button
                      onClick={() => setShowJson(false)}
                      className="px-4 py-2 rounded-lg text-sm"
                      style={{
                        background: !showJson ? "rgba(255, 255, 255, 0.05)" : "transparent",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "#E6EDF7",
                        cursor: "pointer",
                      }}
                    >
                      Summary
                    </button>
                    <button
                      onClick={() => setShowJson(true)}
                      className="px-4 py-2 rounded-lg text-sm"
                      style={{
                        background: showJson ? "rgba(255, 255, 255, 0.05)" : "transparent",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "#E6EDF7",
                        cursor: "pointer",
                      }}
                    >
                      JSON
                    </button>
                  </div>

                  <div
                    className="p-4 rounded-xl shadow-md"
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    {showJson ? (
                      <pre
                        className="m-0 p-4 rounded-lg overflow-x-auto text-sm font-mono leading-relaxed"
                        style={{ background: "#0B1220", color: "#E6EDF7" }}
                      >
                        {JSON.stringify(res.proof_json, null, 2)}
                      </pre>
                    ) : (
                      <div className="text-base leading-relaxed" style={{ color: "#E6EDF7" }}>
                        <div className="mb-3">
                          <strong>Record ID:</strong>{" "}
                          {(res.proof_json.record_id as string) ||
                            (res.proof_json.proof_id as string) ||
                            "N/A"}
                        </div>
                        <div className="mb-3">
                          <strong>Issuer:</strong> {(res.proof_json.issuer as string) || "N/A"}
                        </div>
                        <div className="mb-3">
                          <strong>Issued at:</strong>{" "}
                          {(res.proof_json.issued_at as string) || "N/A"}
                        </div>
                        <div>
                          <strong>Status:</strong> {(res.proof_json.status as string) || "closed"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Sign-off Modal */}
      {showSignOffModal && proofId && res?.proof_json && (
        <SignOffModal
          _proofId={proofId}
          fileName={(res.proof_json.file_name as string) || file?.name || "Unknown"}
          hash={(res.proof_json.hash_full as string) || "Unknown"}
          onAccept={handleAcceptSignOff}
          onDecline={handleDeclineSignOff}
          onClose={() => setShowSignOffModal(false)}
        />
      )}
    </Layout>
  );
}
