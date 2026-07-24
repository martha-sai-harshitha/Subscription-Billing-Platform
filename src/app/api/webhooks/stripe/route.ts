import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

export const runtime = "nodejs";

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

async function processCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId;

  if (!userId || !planId) {
    throw new Error("Checkout session metadata is missing userId or planId");
  }

  if (!session.subscription) {
    throw new Error("Checkout session does not contain a subscription");
  }

  const stripeSubscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id;

  const stripeSubscription =
    await stripe.subscriptions.retrieve(stripeSubscriptionId);

  const stripeCustomerId =
    typeof stripeSubscription.customer === "string"
      ? stripeSubscription.customer
      : stripeSubscription.customer.id;

  const subscriptionData = stripeSubscription as Stripe.Subscription & {
    current_period_start?: number;
    current_period_end?: number;
  };

  const currentPeriodStart = subscriptionData.current_period_start
    ? new Date(subscriptionData.current_period_start * 1000)
    : null;

  const currentPeriodEnd = subscriptionData.current_period_end
    ? new Date(subscriptionData.current_period_end * 1000)
    : null;

  await prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.upsert({
      where: {
        gatewaySubscriptionId: stripeSubscription.id,
      },
      update: {
        userId,
        planId,
        status: mapSubscriptionStatus(stripeSubscription.status),
        gatewayCustomerId: stripeCustomerId,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        cancelledAt: stripeSubscription.canceled_at
          ? new Date(stripeSubscription.canceled_at * 1000)
          : null,
      },
      create: {
        userId,
        planId,
        status: mapSubscriptionStatus(stripeSubscription.status),
        gatewayCustomerId: stripeCustomerId,
        gatewaySubscriptionId: stripeSubscription.id,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        cancelledAt: stripeSubscription.canceled_at
          ? new Date(stripeSubscription.canceled_at * 1000)
          : null,
      },
    });

    await tx.payment.update({
      where: {
        gatewayCheckoutSession: session.id,
      },
      data: {
        subscriptionId: subscription.id,
        status:
          session.payment_status === "paid" ? "SUCCESS" : "PENDING",
      },
    });
  });
}

export async function POST(request: Request): Promise<Response> {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature) {
    return Response.json(
      { error: "Missing Stripe signature" },
      { status: 400 },
    );
  }

  if (!webhookSecret) {
    return Response.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured" },
      { status: 500 },
    );
  }

  // Stripe requires the untouched raw body for signature verification.
  const rawBody = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);

    return Response.json(
      { error: "Invalid webhook signature" },
      { status: 400 },
    );
  }

  try {
    await prisma.webhookEvent.create({
      data: {
        eventId: event.id,
        eventType: event.type,
        status: "PROCESSING",
        payload: event as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json({
        received: true,
        duplicate: true,
      });
    }

    console.error("Failed to record webhook event:", error);

    return Response.json(
      { error: "Failed to record webhook event" },
      { status: 500 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await processCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }

    await prisma.webhookEvent.update({
      where: {
        eventId: event.id,
      },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
        errorMessage: null,
      },
    });

    return Response.json({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown webhook error";

    console.error(`Webhook processing failed: ${event.id}`, error);

    await prisma.webhookEvent.update({
      where: {
        eventId: event.id,
      },
      data: {
        status: "FAILED",
        errorMessage: message.slice(0, 1000),
      },
    });

    return Response.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}