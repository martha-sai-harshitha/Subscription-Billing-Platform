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
        cancelAtPeriodEnd: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!subscription || !subscription.gatewaySubscriptionId) {
      return NextResponse.json(
        {
          error:
            "No active subscription scheduled for cancellation was found.",
        },
        { status: 404 },
      );
    }

    const stripeSubscription =
      await stripe.subscriptions.update(
        subscription.gatewaySubscriptionId,
        {
          cancel_at_period_end: false,
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
          cancelledAt: null,
          currentPeriodStart,
          currentPeriodEnd,
        },
      });

    return NextResponse.json({
      message:
        "Subscription resumed successfully. Automatic renewal is active again.",
      subscription: updatedSubscription,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to resume subscription";

    console.error("Resume subscription error:", error);

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}