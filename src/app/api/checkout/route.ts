import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/current-user";

type CheckoutRequest = {
  planId?: string;
};

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const body: CheckoutRequest = await request.json();

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

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",

      customer_email: user.email,

      line_items: [
        {
          price_data: {
            currency: plan.currency.toLowerCase(),

            product_data: {
              name: plan.name,
              description: plan.description ?? undefined,
            },

            unit_amount: plan.priceInCents,

            recurring: {
              interval:
                plan.interval === "YEARLY" ? "year" : "month",
            },
          },

          quantity: 1,
        },
      ],

      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?cancelled=true`,

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
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 500 },
      );
    }

    await prisma.payment.create({
      data: {
        userId: user.id,
        gatewayCheckoutSession: session.id,
        amountInCents: plan.priceInCents,
        currency: plan.currency,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      checkoutUrl: session.url,
    });
  } catch (error) {
    console.error("Checkout session creation error:", error);

    return NextResponse.json(
      { error: "Unable to create checkout session" },
      { status: 500 },
    );
  }
}