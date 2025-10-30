"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SignOffModalProps {
  _proofId: string;
  fileName: string;
  hash: string;
  onAccept: () => void;
  onDecline: (reason: string) => void;
  onClose: () => void;
}

export function SignOffModal({
  _proofId,
  fileName,
  hash,
  onAccept,
  onDecline,
  onClose,
}: SignOffModalProps) {
  const [accepted, setAccepted] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [showDecline, setShowDecline] = useState(false);

  const handleAccept = async () => {
    if (!accepted) {
      alert("Please confirm acceptance by checking the box");
      return;
    }
    onAccept();
  };

  const handleDecline = async () => {
    if (declineReason.trim().length < 10) {
      alert("Please provide a reason (minimum 10 characters)");
      return;
    }
    onDecline(declineReason);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-2xl w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">Delivery Sign-Off Request</h2>

        <div className="mb-6">
          <p className="mb-2">
            <strong>File:</strong> {fileName}
          </p>
          <p className="mb-2">
            <strong>SHA-256 Hash:</strong>
          </p>
          <code className="block bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs break-all">
            {hash}
          </code>
        </div>

        {!showDecline ? (
          <>
            <div className="mb-6 border border-gray-300 dark:border-gray-600 rounded p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm">
                  I accept delivery of the asset named above at this exact hash (SHA-256:{" "}
                  <code className="text-xs">{hash.slice(0, 16)}...</code>). By accepting, I confirm
                  that I have received and verified the delivered asset. This acceptance will be
                  recorded with timestamp, IP address, and user agent for dispute resolution
                  purposes.
                </span>
              </label>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleAccept} disabled={!accepted} className="btn-primary flex-1">
                Accept and Record
              </Button>
              <Button onClick={() => setShowDecline(true)} className="btn-secondary flex-1">
                Decline with Reason
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6">
              <label className="block mb-2 text-sm font-medium">
                Reason for declining (minimum 10 characters):
              </label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="textarea w-full h-32"
                placeholder="Please explain why you are declining this delivery..."
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={handleDecline} className="btn-secondary flex-1">
                Submit Decline
              </Button>
              <Button onClick={() => setShowDecline(false)} className="btn-secondary flex-1">
                Back to Accept
              </Button>
            </div>
          </>
        )}

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
