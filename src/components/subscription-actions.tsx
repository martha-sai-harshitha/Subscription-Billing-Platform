"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SubscriptionActionsProps = {
  cancelAtPeriodEnd: boolean;
};

export function SubscriptionActions({
  cancelAtPeriodEnd,
}: SubscriptionActionsProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleAction() {
    setLoading(true);
    setMessage("");
    setError("");

    const endpoint = cancelAtPeriodEnd
      ? "/api/subscription/resume"
      : "/api/subscription/cancel";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
      });

      const data = (await response.json()) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Request failed");
      }

      setMessage(data.message || "Subscription updated");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to update subscription",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={handleAction}
        disabled={loading}
        className={`rounded-xl px-5 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          cancelAtPeriodEnd
            ? "bg-emerald-500 text-white hover:bg-emerald-400"
            : "bg-red-500 text-white hover:bg-red-400"
        }`}
      >
        {loading
          ? "Processing..."
          : cancelAtPeriodEnd
            ? "Resume subscription"
            : "Cancel subscription"}
      </button>

      {message && (
        <p className="mt-3 text-sm text-emerald-400">
          {message}
        </p>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}