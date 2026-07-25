import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";

type CheckoutRequest = {
  planId?: string;
};

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as CheckoutRequest;

    if (!body.planId) {
      return NextResponse.json(
        { error: "Plan ID is required" },
        { status: 400 },
      );
    }

    const plan = await prisma.plan.findFirst({
      where: {
        id: body.planId,
        isActive: true,
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404 },
      );
    }

    if (!plan.stripePriceId) {
      return NextResponse.json(
        {
          error: `Stripe Price ID is not configured for the ${plan.name} plan`,
        },
        { status: 500 },
      );
    }

    /*
     * Prevent the user from purchasing another subscription
     * while they already have an active or pending subscription.
     * Plan changes will be handled separately.
     */
    const existingSubscription =
      await prisma.subscription.findFirst({
        where: {
          userId: user.id,
          status: {
            in: ["ACTIVE", "PENDING"],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    if (existingSubscription) {
      return NextResponse.json(
        {
          error:
            "You already have a subscription. Use the dashboard to change your plan.",
        },
        { status: 409 },
      );
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
      "http://localhost:3000";

    const session =
      await stripe.checkout.sessions.create({
        mode: "subscription",

        customer_email: user.email,

        line_items: [
          {
            price: plan.stripePriceId,
            quantity: 1,
          },
        ],

        success_url:
          `${appUrl}/checkout/success` +
          "?session_id={CHECKOUT_SESSION_ID}",

        cancel_url:
          `${appUrl}/pricing?cancelled=true`,

        metadata: {
          userId: user.id,
          planId: plan.id,
        },

        subscription_data: {
          metadata: {
            userId: user.id,
            planId: plan.id,
          },
        },

        /*
         * This lets Stripe reuse the payment method for
         * future recurring subscription payments.
         */
        payment_method_collection: "always",

        allow_promotion_codes: true,
      });

    if (!session.url) {
      return NextResponse.json(
        {
          error: "Stripe did not return a checkout URL",
        },
        { status: 500 },
      );
    }

    /*
     * Record a pending payment before redirecting to Stripe.
     * The webhook changes it to SUCCESS after checkout.
     */
    await prisma.payment.create({
      data: {
        userId: user.id,
        gatewayCheckoutSession: session.id,
        amountInCents: plan.priceInCents,
        currency: plan.currency.toUpperCase(),
        status: "PENDING",
      },
    });

    return NextResponse.json({
      checkoutUrl: session.url,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown checkout error";

    console.error(
      "Checkout session creation error:",
      error,
    );

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}