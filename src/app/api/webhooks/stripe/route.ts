import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

export const runtime = "nodejs";

type DatabaseClient = typeof prisma;

type ResolvedSubscriptionMetadata = {
  userId?: string;
  planId?: string;
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

async function syncSubscription(
  stripeSubscription: Stripe.Subscription,
  userId?: string,
  planId?: string,
  database: DatabaseClient | Prisma.TransactionClient = prisma,
) {
  const stripeCustomerId =
    typeof stripeSubscription.customer === "string"
      ? stripeSubscription.customer
      : stripeSubscription.customer.id;

  const { currentPeriodStart, currentPeriodEnd } =
    getSubscriptionPeriod(stripeSubscription);

  const resolvedUserId =
    userId || stripeSubscription.metadata?.userId;

  const resolvedPlanId =
    planId || stripeSubscription.metadata?.planId;

  const existingSubscription =
    await database.subscription.findUnique({
      where: {
        gatewaySubscriptionId: stripeSubscription.id,
      },
    });

  if (
    !existingSubscription &&
    (!resolvedUserId || !resolvedPlanId)
  ) {
    throw new Error(
      `Cannot create subscription ${stripeSubscription.id}: userId or planId is missing.`,
    );
  }

  return database.subscription.upsert({
    where: {
      gatewaySubscriptionId: stripeSubscription.id,
    },

    update: {
      status: mapSubscriptionStatus(stripeSubscription.status),
      gatewayCustomerId: stripeCustomerId,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd:
        stripeSubscription.cancel_at_period_end,
      cancelledAt: stripeSubscription.canceled_at
        ? new Date(stripeSubscription.canceled_at * 1000)
        : null,

      ...(resolvedUserId
        ? {
            userId: resolvedUserId,
          }
        : {}),

      ...(resolvedPlanId
        ? {
            planId: resolvedPlanId,
          }
        : {}),
    },

    create: {
      userId: resolvedUserId!,
      planId: resolvedPlanId!,
      status: mapSubscriptionStatus(stripeSubscription.status),
      gatewayCustomerId: stripeCustomerId,
      gatewaySubscriptionId: stripeSubscription.id,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd:
        stripeSubscription.cancel_at_period_end,
      cancelledAt: stripeSubscription.canceled_at
        ? new Date(stripeSubscription.canceled_at * 1000)
        : null,
    },
  });
}

async function resolveSubscriptionMetadata(
  stripeSubscription: Stripe.Subscription,
  database: DatabaseClient | Prisma.TransactionClient = prisma,
): Promise<ResolvedSubscriptionMetadata> {
  const existingSubscription =
    await database.subscription.findUnique({
      where: {
        gatewaySubscriptionId: stripeSubscription.id,
      },
    });

  if (existingSubscription) {
    return {
      userId: existingSubscription.userId,
      planId: existingSubscription.planId,
    };
  }

  const subscriptionMetadata = {
    userId: stripeSubscription.metadata?.userId,
    planId: stripeSubscription.metadata?.planId,
  };

  if (
    subscriptionMetadata.userId &&
    subscriptionMetadata.planId
  ) {
    return subscriptionMetadata;
  }

  const checkoutSessions =
    await stripe.checkout.sessions.list({
      subscription: stripeSubscription.id,
      limit: 1,
    });

  const checkoutSession = checkoutSessions.data[0];

  const userId =
    subscriptionMetadata.userId ||
    checkoutSession?.metadata?.userId;

  let planId =
    subscriptionMetadata.planId ||
    checkoutSession?.metadata?.planId;

  if (!planId) {
    const stripePriceId =
      stripeSubscription.items.data[0]?.price.id;

    if (stripePriceId) {
      const plan = await database.plan.findUnique({
        where: {
          stripePriceId,
        },
      });

      planId = plan?.id;
    }
  }

  if (userId && planId) {
    return {
      userId,
      planId,
    };
  }

  return {
    userId,
    planId,
  };
}

async function processCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId;

  if (!userId || !planId) {
    throw new Error(
      `Checkout session ${session.id} is missing userId or planId metadata.`,
    );
  }

  if (!session.subscription) {
    throw new Error(
      `Checkout session ${session.id} does not contain a subscription.`,
    );
  }

  const stripeSubscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id;

  const stripeSubscription =
    await stripe.subscriptions.retrieve(
      stripeSubscriptionId,
    );

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  await prisma.$transaction(async (tx) => {
    const subscription = await syncSubscription(
      stripeSubscription,
      userId,
      planId,
      tx,
    );

    await tx.payment.update({
      where: {
        gatewayCheckoutSession: session.id,
      },

      data: {
        subscriptionId: subscription.id,
        gatewayPaymentId: paymentIntentId,
        status:
          session.payment_status === "paid"
            ? "SUCCESS"
            : "PENDING",
      },
    });
  });
}

async function processSubscriptionUpdated(
  stripeSubscription: Stripe.Subscription,
): Promise<void> {
  const { userId, planId } =
    await resolveSubscriptionMetadata(stripeSubscription);

  await syncSubscription(
    stripeSubscription,
    userId,
    planId,
  );
}

async function processSubscriptionDeleted(
  stripeSubscription: Stripe.Subscription,
): Promise<void> {
  const { userId, planId } =
    await resolveSubscriptionMetadata(stripeSubscription);

  await syncSubscription(
    stripeSubscription,
    userId,
    planId,
  );
}

async function processInvoicePaymentSucceeded(
  stripeInvoice: Stripe.Invoice,
): Promise<void> {
  /*
   * Stripe invoice fields have changed across API versions.
   * This compatibility type lets the webhook work with the
   * invoice structure returned by the installed Stripe SDK.
   */
  const invoice = stripeInvoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
    payment_intent?: string | Stripe.PaymentIntent | null;
  };

  if (!invoice.subscription) {
    console.log(
      `Invoice ${invoice.id} does not contain a subscription.`,
    );

    return;
  }

  const gatewaySubscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription.id;

  const subscription =
    await prisma.subscription.findUnique({
      where: {
        gatewaySubscriptionId,
      },
    });

  if (!subscription) {
    console.error(
      `Local subscription not found for Stripe subscription ${gatewaySubscriptionId}.`,
    );

    return;
  }

  const gatewayPaymentId =
    typeof invoice.payment_intent === "string"
      ? invoice.payment_intent
      : invoice.payment_intent?.id ?? null;

  /*
   * Some invoice events might not expose a PaymentIntent,
   * depending on the Stripe API version and payment method.
   * Use the Stripe invoice ID as a stable fallback identifier.
   */
  const paymentReference =
    gatewayPaymentId || `invoice_${invoice.id}`;

  const existingPayment =
    await prisma.payment.findUnique({
      where: {
        gatewayPaymentId: paymentReference,
      },
    });

  if (existingPayment) {
    return;
  }

  const payment = await prisma.payment.create({
    data: {
      userId: subscription.userId,
      subscriptionId: subscription.id,
      gatewayPaymentId: paymentReference,
      amountInCents: invoice.amount_paid,
      currency: invoice.currency.toUpperCase(),
      status: "SUCCESS",
    },
  });

  /*
   * Create a local invoice record when Stripe supplies
   * an invoice number.
   */
  const invoiceNumber =
    invoice.number || invoice.id;

  await prisma.invoice.upsert({
    where: {
      invoiceNumber,
    },

    update: {
      paymentId: payment.id,
      amountInCents: invoice.amount_paid,
      currency: invoice.currency.toUpperCase(),
      pdfUrl: invoice.invoice_pdf,
      issuedAt: invoice.created
        ? new Date(invoice.created * 1000)
        : new Date(),
    },

    create: {
      invoiceNumber,
      paymentId: payment.id,
      amountInCents: invoice.amount_paid,
      currency: invoice.currency.toUpperCase(),
      pdfUrl: invoice.invoice_pdf,
      issuedAt: invoice.created
        ? new Date(invoice.created * 1000)
        : new Date(),
    },
  });
}

async function processInvoicePaymentFailed(
  stripeInvoice: Stripe.Invoice,
): Promise<void> {
  const invoice = stripeInvoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
    payment_intent?: string | Stripe.PaymentIntent | null;
  };

  if (!invoice.subscription) {
    return;
  }

  const gatewaySubscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription.id;

  const subscription =
    await prisma.subscription.findUnique({
      where: {
        gatewaySubscriptionId,
      },
    });

  if (!subscription) {
    console.error(
      `Subscription not found for failed invoice ${invoice.id}.`,
    );

    return;
  }

  const gatewayPaymentId =
    typeof invoice.payment_intent === "string"
      ? invoice.payment_intent
      : invoice.payment_intent?.id ?? null;

  const paymentReference =
    gatewayPaymentId || `invoice_${invoice.id}`;

  await prisma.payment.upsert({
    where: {
      gatewayPaymentId: paymentReference,
    },

    update: {
      status: "FAILED",
      failureReason:
        "Stripe invoice payment failed",
    },

    create: {
      userId: subscription.userId,
      subscriptionId: subscription.id,
      gatewayPaymentId: paymentReference,
      amountInCents: invoice.amount_due,
      currency: invoice.currency.toUpperCase(),
      status: "FAILED",
      failureReason:
        "Stripe invoice payment failed",
    },
  });
}

export async function POST(
  request: Request,
): Promise<Response> {
  const signature =
    request.headers.get("stripe-signature");

  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature) {
    return Response.json(
      {
        error: "Missing Stripe signature",
      },
      {
        status: 400,
      },
    );
  }

  if (!webhookSecret) {
    console.error(
      "STRIPE_WEBHOOK_SECRET is not configured.",
    );

    return Response.json(
      {
        error: "Stripe webhook is not configured",
      },
      {
        status: 500,
      },
    );
  }

  /*
   * Stripe signature verification requires the original
   * untouched request body. Do not use request.json().
   */
  const rawBody = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch (error) {
    console.error(
      "Stripe webhook signature verification failed:",
      error,
    );

    return Response.json(
      {
        error: "Invalid webhook signature",
      },
      {
        status: 400,
      },
    );
  }

  let shouldProcessEvent = true;

  try {
    await prisma.webhookEvent.create({
      data: {
        eventId: event.id,
        eventType: event.type,
        status: "PROCESSING",
        payload:
          event as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existingEvent =
        await prisma.webhookEvent.findUnique({
          where: {
            eventId: event.id,
          },
        });

      if (existingEvent?.status === "PROCESSED") {
        shouldProcessEvent = false;
      } else {
        await prisma.webhookEvent.update({
          where: {
            eventId: event.id,
          },

          data: {
            eventType: event.type,
            status: "PROCESSING",
            payload:
              event as unknown as Prisma.InputJsonValue,
            errorMessage: null,
          },
        });
      }
    } else {
      console.error(
        "Unable to record Stripe webhook event:",
        error,
      );

      return Response.json(
        {
          error: "Unable to record webhook event",
        },
        {
          status: 500,
        },
      );
    }
  }

  if (!shouldProcessEvent) {
    return Response.json({
      received: true,
      duplicate: true,
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await processCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "customer.subscription.created":
        await processSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;
      case "customer.subscription.updated":
        await processSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "customer.subscription.deleted":
        await processSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "invoice.payment_succeeded":
        await processInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice,
        );
        break;

      case "invoice.payment_failed":
        await processInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
        );
        break;

      default:
        console.log(
          `Unhandled Stripe event type: ${event.type}`,
        );
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

    return Response.json({
      received: true,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown webhook processing error";

    console.error(
      `Webhook processing failed for ${event.id}:`,
      error,
    );

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
      {
        error: "Webhook processing failed",
      },
      {
        status: 500,
      },
    );
  }
}
