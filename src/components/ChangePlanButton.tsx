"use client";

import { useState } from "react";

type ChangePlanButtonProps = {
  planId: string;
  planName: string;
  changeType: "upgrade" | "downgrade";
};

type ChangePlanResponse = {
  checkoutUrl?: string;
  error?: string;
};

export function ChangePlanButton({
  planId,
  planName,
  changeType,
}: ChangePlanButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleChangePlan() {
    const confirmed = window.confirm(
      changeType === "upgrade"
        ? `Continue to payment to upgrade to ${planName}?`
        : `Continue to payment to switch to ${planName}? Your current subscription will be cancelled only after the new payment succeeds.`,
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/subscription/change-plan",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            planId,
          }),
        },
      );

      const data =
        (await response.json()) as ChangePlanResponse;

      if (!response.ok || !data.checkoutUrl) {
        throw new Error(
          data.error ??
            "Unable to start the plan-change payment",
        );
      }

      window.location.href = data.checkoutUrl;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to start the plan-change payment";

      setError(message);
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleChangePlan}
        disabled={loading}
        className={
          changeType === "upgrade"
            ? "w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-indigo-400 hover:to-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
            : "w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {loading
          ? "Opening payment..."
          : changeType === "upgrade"
            ? `Upgrade to ${planName}`
            : `Downgrade to ${planName}`}
      </button>

      {error ? (
        <p className="mt-2 text-sm text-rose-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}