import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";

export async function POST(): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: "ACTIVE",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!subscription || !subscription.gatewaySubscriptionId) {
      return NextResponse.json(
        { error: "No active subscription found to cancel" },
        { status: 404 },
      );
    }

    if (subscription.cancelAtPeriodEnd) {
      return NextResponse.json(
        {
          message:
            "Your subscription is already scheduled for cancellation.",
        },
        { status: 200 },
      );
    }

    const stripeSubscription =
      await stripe.subscriptions.update(
        subscription.gatewaySubscriptionId,
        {
          cancel_at_period_end: true,
        },
      );

    const subscriptionItem =
      stripeSubscription.items.data[0];

    const currentPeriodStart =
      subscriptionItem?.current_period_start
        ? new Date(
            subscriptionItem.current_period_start * 1000,
          )
        : subscription.currentPeriodStart;

    const currentPeriodEnd =
      subscriptionItem?.current_period_end
        ? new Date(
            subscriptionItem.current_period_end * 1000,
          )
        : subscription.currentPeriodEnd;

    const updatedSubscription =
      await prisma.subscription.update({
        where: {
          id: subscription.id,
        },
        data: {
          cancelAtPeriodEnd:
            stripeSubscription.cancel_at_period_end,
          currentPeriodStart,
          currentPeriodEnd,

          // Keep this null until Stripe actually cancels it.
          cancelledAt: null,
        },
      });

    return NextResponse.json({
      message:
        "Your subscription will cancel at the end of the current billing period.",
      subscription: updatedSubscription,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to cancel subscription";

    console.error("Cancel subscription error:", error);

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}