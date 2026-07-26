import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";

type ChangePlanBody = {
  planId?: string;
};

function mapStripeStatus(
  status:
    | "active"
    | "trialing"
    | "past_due"
    | "unpaid"
    | "canceled"
    | "incomplete"
    | "incomplete_expired"
    | "paused",
): "ACTIVE" | "PENDING" | "CANCELLED" | "EXPIRED" {
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

export async function POST(
  request: Request,
): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const body = (await request.json()) as ChangePlanBody;
    const planId = body.planId;

    if (!planId) {
      return NextResponse.json(
        {
          error: "Plan ID is required",
        },
        {
          status: 400,
        },
      );
    }

    const newPlan = await prisma.plan.findUnique({
      where: {
        id: planId,
      },
    });

    if (!newPlan) {
      return NextResponse.json(
        {
          error: "Selected plan was not found",
        },
        {
          status: 404,
        },
      );
    }

    if (!newPlan.isActive) {
      return NextResponse.json(
        {
          error: "Selected plan is not active",
        },
        {
          status: 400,
        },
      );
    }

    if (!newPlan.stripePriceId) {
      return NextResponse.json(
        {
          error:
            "The selected plan does not have a Stripe price ID",
        },
        {
          status: 400,
        },
      );
    }

    const currentSubscription =
      await prisma.subscription.findFirst({
        where: {
          userId: user.id,

          status: {
            in: ["ACTIVE", "PENDING"],
          },

          gatewaySubscriptionId: {
            not: null,
          },
        },

        include: {
          plan: true,
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    if (!currentSubscription) {
      return NextResponse.json(
        {
          error: "You do not have an active subscription",
        },
        {
          status: 404,
        },
      );
    }

    if (currentSubscription.planId === newPlan.id) {
      return NextResponse.json(
        {
          error: "You are already subscribed to this plan",
        },
        {
          status: 400,
        },
      );
    }

    const gatewaySubscriptionId =
      currentSubscription.gatewaySubscriptionId;

    if (!gatewaySubscriptionId) {
      return NextResponse.json(
        {
          error: "Stripe subscription ID is missing",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Retrieve the existing Stripe subscription.
     */
    const stripeSubscription =
      await stripe.subscriptions.retrieve(
        gatewaySubscriptionId,
      );

    const currentItem =
      stripeSubscription.items.data[0];

    if (!currentItem) {
      return NextResponse.json(
        {
          error: "Stripe subscription item was not found",
        },
        {
          status: 400,
        },
      );
    }

    const changeType =
      newPlan.priceInCents >
      currentSubscription.plan.priceInCents
        ? "upgrade"
        : "downgrade";

    /*
     * Replace the current Stripe price.
     *
     * always_invoice:
     * - creates proration adjustments
     * - creates an invoice immediately
     * - attempts to collect the payment immediately
     *
     * pending_if_incomplete:
     * - if payment fails, Stripe does not immediately apply
     *   the plan change
     */
    const updatedStripeSubscription =
      await stripe.subscriptions.update(
        gatewaySubscriptionId,
        {
          items: [
            {
              id: currentItem.id,
              price: newPlan.stripePriceId,
              quantity: currentItem.quantity ?? 1,
            },
          ],

          proration_behavior: "always_invoice",

          payment_behavior: "pending_if_incomplete",

          cancel_at_period_end: false,

          metadata: {
            ...stripeSubscription.metadata,
            userId: user.id,
            planId: newPlan.id,
          },
        },
      );

    /*
     * When payment is incomplete, Stripe stores the requested
     * change as a pending update. Do not update Prisma yet.
     */
    if (updatedStripeSubscription.pending_update) {
      return NextResponse.json(
        {
          success: false,
          paymentRequired: true,
          changeType,
          message:
            "Stripe could not complete the payment. Your current plan remains active.",
        },
        {
          status: 402,
        },
      );
    }

    const updatedItem =
      updatedStripeSubscription.items.data[0];

    if (!updatedItem) {
      return NextResponse.json(
        {
          error:
            "Updated Stripe subscription item was not found",
        },
        {
          status: 500,
        },
      );
    }

    const currentPeriodStart =
      updatedItem.current_period_start
        ? new Date(updatedItem.current_period_start * 1000)
        : currentSubscription.currentPeriodStart;

    const currentPeriodEnd =
      updatedItem.current_period_end
        ? new Date(updatedItem.current_period_end * 1000)
        : currentSubscription.currentPeriodEnd;

    const stripeCustomerId =
      typeof updatedStripeSubscription.customer === "string"
        ? updatedStripeSubscription.customer
        : updatedStripeSubscription.customer.id;

    const localStatus = mapStripeStatus(
      updatedStripeSubscription.status,
    );

    /*
     * Update Prisma only after Stripe successfully applies
     * the plan change.
     */
    const updatedLocalSubscription =
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: {
            id: user.id,
          },

          data: {
            stripeCustomerId,
          },
        });

        return tx.subscription.update({
          where: {
            id: currentSubscription.id,
          },

          data: {
            planId: newPlan.id,

            gatewayCustomerId: stripeCustomerId,

            currentPeriodStart,
            currentPeriodEnd,

            cancelAtPeriodEnd:
              updatedStripeSubscription.cancel_at_period_end,

            cancelledAt: null,

            pendingPlanId: null,

            status: localStatus,
          },

          include: {
            plan: true,
          },
        });
      });

    return NextResponse.json({
      success: true,

      changeType,

      message:
        changeType === "upgrade"
          ? `Successfully upgraded to ${newPlan.name}`
          : `Successfully downgraded to ${newPlan.name}`,

      subscription: {
        id: updatedLocalSubscription.id,

        planId: updatedLocalSubscription.planId,

        planName:
          updatedLocalSubscription.plan.name,

        status:
          updatedLocalSubscription.status,

        currentPeriodStart:
          updatedLocalSubscription.currentPeriodStart,

        currentPeriodEnd:
          updatedLocalSubscription.currentPeriodEnd,

        cancelAtPeriodEnd:
          updatedLocalSubscription.cancelAtPeriodEnd,
      },
    });
  } catch (error) {
    console.error(
      "Unable to change subscription plan:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to change subscription plan";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      },
    );
  }
}