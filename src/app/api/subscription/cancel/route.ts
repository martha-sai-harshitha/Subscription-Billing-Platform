import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/current-user";
import { sendCancellationEmail } from "@/lib/email";

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
      include: {
        plan: true,
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

          // Keep ACTIVE until Stripe ends the subscription.
          status: "ACTIVE",
          cancelledAt: null,
        },
        include: {
          plan: true,
        },
      });

    try {
      console.log(
        "Sending cancellation email to:",
        user.email,
      );

      const emailResult =
        await sendCancellationEmail({
          to: "marthasaiharshitha23@gmail.com",
          name: user.name,
          planName:
            updatedSubscription.plan.name,
          accessEndDate:
            updatedSubscription.currentPeriodEnd,
        });

      console.log(
        "Cancellation email sent successfully:",
        emailResult,
      );
    } catch (emailError) {
      // The subscription cancellation should still succeed
      // even when the email provider fails.
      console.error(
        "Cancellation email failed:",
        emailError,
      );
    }

    return NextResponse.json({
      message:
        "Your subscription will cancel at the end of the current billing period.",
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        cancelAtPeriodEnd:
          updatedSubscription.cancelAtPeriodEnd,
        currentPeriodStart:
          updatedSubscription.currentPeriodStart,
        currentPeriodEnd:
          updatedSubscription.currentPeriodEnd,
        planName:
          updatedSubscription.plan.name,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to cancel subscription";

    console.error(
      "Cancel subscription error:",
      error,
    );

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}