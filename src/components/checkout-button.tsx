"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CheckoutButtonProps = {
  planId: string;
  planName: string;
  isPopular?: boolean;
};

export function CheckoutButton({
  planId,
  planName,
  isPopular = false,
}: CheckoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCheckout() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId }),
      });

      const data = (await response.json()) as {
        checkoutUrl?: string;
        error?: string;
      };

      if (response.status === 401) {
        router.push("/login?redirect=/pricing");
        return;
      }

      if (!response.ok || !data.checkoutUrl) {
        throw new Error(data.error ?? "Unable to start checkout");
      }

      window.location.href = data.checkoutUrl;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to start checkout",
      );

      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        className={`w-full rounded-xl px-5 py-3 text-center font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          isPopular
            ? "bg-indigo-500 text-white hover:bg-indigo-400"
            : "bg-white text-slate-950 hover:bg-slate-200"
        }`}
      >
        {loading ? "Redirecting…" : `Choose ${planName}`}
      </button>

      {error && (
        <p className="mt-3 text-center text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}