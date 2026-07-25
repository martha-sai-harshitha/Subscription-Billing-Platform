import Link from "next/link";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

export const runtime = "nodejs";

type SuccessPageProps = {
  searchParams: Promise<{
    session_id?: string;
  }>;
};

type ReconcileResult = {
  status: "synced" | "pending" | "skipped" | "error";
  message: string;
};

function mapSubscriptionStatus(
  status: Stripe.Subscription.Status,
): "PENDING" | "ACTIVE" | "CANCELLED" | "EXPIRED" {
  switch (status) {
    case "active":
    case "trialing":
      return "ACTIVE";

    case "canceled":
      return "CANCELLED";

    case "incomplete_expired":
      return "EXPIRED";

    default:
      return "PENDING";
  }
}

function getSubscriptionPeriod(subscription: Stripe.Subscription): {
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
} {
  const subscriptionItem = subscription.items.data[0];

  return {
    currentPeriodStart: subscriptionItem?.current_period_start
      ? new Date(subscriptionItem.current_period_start * 1000)
      : null,
    currentPeriodEnd: subscriptionItem?.current_period_end
      ? new Date(subscriptionItem.current_period_end * 1000)
      : null,
  };
}

async function reconcileCheckoutSession(
  sessionId: string | undefined,
): Promise<ReconcileResult> {
  if (!sessionId) {
    return {
      status: "skipped",
      message: "No checkout session was returned.",
    };
  }

  const user = await getCurrentUser();

  if (!user) {
    return {
      status: "skipped",
      message: "Sign in to finish syncing your subscription.",
    };
  }

  try {
    const session =
      await stripe.checkout.sessions.retrieve(sessionId);

    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId;

    if (!userId || !planId || userId !== user.id) {
      return {
        status: "error",
        message:
          "This checkout session could not be matched to your account.",
      };
    }

    if (session.payment_status !== "paid") {
      return {
        status: "pending",
        message:
          "Stripe has not marked this payment as paid yet.",
      };
    }

    if (!session.subscription) {
      return {
        status: "error",
        message:
          "Stripe did not return a subscription for this checkout.",
      };
    }

    const stripeSubscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;

    const stripeSubscription =
      await stripe.subscriptions.retrieve(
        stripeSubscriptionId,
      );

    const stripeCustomerId =
      typeof stripeSubscription.customer === "string"
        ? stripeSubscription.customer
        : stripeSubscription.customer.id;

    const { currentPeriodStart, currentPeriodEnd } =
      getSubscriptionPeriod(stripeSubscription);

    const gatewayPaymentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.upsert({
        where: {
          gatewaySubscriptionId: stripeSubscription.id,
        },

        update: {
          userId,
          planId,
          status: mapSubscriptionStatus(
            stripeSubscription.status,
          ),
          gatewayCustomerId: stripeCustomerId,
          currentPeriodStart,
          currentPeriodEnd,
          cancelAtPeriodEnd:
            stripeSubscription.cancel_at_period_end,
          cancelledAt: stripeSubscription.canceled_at
            ? new Date(
                stripeSubscription.canceled_at * 1000,
              )
            : null,
        },

        create: {
          userId,
          planId,
          status: mapSubscriptionStatus(
            stripeSubscription.status,
          ),
          gatewayCustomerId: stripeCustomerId,
          gatewaySubscriptionId: stripeSubscription.id,
          currentPeriodStart,
          currentPeriodEnd,
          cancelAtPeriodEnd:
            stripeSubscription.cancel_at_period_end,
          cancelledAt: stripeSubscription.canceled_at
            ? new Date(
                stripeSubscription.canceled_at * 1000,
              )
            : null,
        },
      });

      await tx.payment.updateMany({
        where: {
          userId,
          gatewayCheckoutSession: session.id,
        },
        data: {
          subscriptionId: subscription.id,
          gatewayPaymentId,
          status: "SUCCESS",
        },
      });
    });

    return {
      status: "synced",
      message: "Your paid subscription is now active.",
    };
  } catch (error) {
    const message =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unknown checkout sync error";

    console.error(
      "Checkout success reconciliation failed:",
      error,
    );

    return {
      status: "error",
      message,
    };
  }
}

export default async function CheckoutSuccessPage({
  searchParams,
}: SuccessPageProps) {
  const { session_id: sessionId } = await searchParams;
  const reconcileResult =
    await reconcileCheckoutSession(sessionId);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-10 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-3xl text-green-400">
          ✓
        </div>

        <h1 className="mt-6 text-3xl font-bold">
          Payment completed
        </h1>

        <p className="mt-4 text-slate-400">
          Thank you. Stripe has completed your checkout.
        </p>

        <p
          className={
            reconcileResult.status === "synced"
              ? "mt-4 text-sm text-emerald-400"
              : reconcileResult.status === "pending"
                ? "mt-4 text-sm text-amber-400"
                : "mt-4 text-sm text-slate-400"
          }
        >
          {reconcileResult.message}
        </p>

        {sessionId && (
          <p className="mt-4 break-all text-xs text-slate-500">
            Checkout session: {sessionId}
          </p>
        )}

        <Link
          href="/dashboard"
          className="mt-8 inline-block rounded-xl bg-indigo-500 px-6 py-3 font-semibold hover:bg-indigo-400"
        >
          Go to dashboard
        </Link>
      </section>
    </main>
  );
}
