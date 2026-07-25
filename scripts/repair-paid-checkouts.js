require("dotenv/config");

const { Client } = require("pg");
const { randomUUID } = require("crypto");
const Stripe = require("stripe");

function mapSubscriptionStatus(status) {
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

function toDate(seconds) {
  return seconds ? new Date(seconds * 1000) : null;
}

async function main() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  const payments = await client.query(`
    select
      id,
      "gatewayCheckoutSession"
    from "Payment"
    where status = 'PENDING'
      and "gatewayCheckoutSession" is not null
    order by "createdAt" desc
  `);

  const repaired = [];
  const skipped = [];

  for (const payment of payments.rows) {
    const session = await stripe.checkout.sessions.retrieve(
      payment.gatewayCheckoutSession,
    );

    if (
      session.mode !== "subscription" ||
      session.status !== "complete" ||
      session.payment_status !== "paid" ||
      !session.subscription
    ) {
      skipped.push({
        paymentId: payment.id,
        checkoutSession: session.id,
        checkoutStatus: session.status,
        paymentStatus: session.payment_status,
      });
      continue;
    }

    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId;

    if (!userId || !planId) {
      skipped.push({
        paymentId: payment.id,
        checkoutSession: session.id,
        reason: "missing metadata",
      });
      continue;
    }

    const stripeSubscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;

    const subscription =
      await stripe.subscriptions.retrieve(
        stripeSubscriptionId,
      );

    const stripeCustomerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;

    const item = subscription.items.data[0];
    const currentPeriodStart = toDate(
      item?.current_period_start,
    );
    const currentPeriodEnd = toDate(item?.current_period_end);
    const cancelledAt = toDate(subscription.canceled_at);
    const localStatus = mapSubscriptionStatus(
      subscription.status,
    );

    await client.query("begin");

    try {
      const subscriptionId =
        "sub_" + randomUUID().replaceAll("-", "");

      const upserted = await client.query(
        `
          insert into "Subscription" (
            id,
            "userId",
            "planId",
            status,
            "gatewayCustomerId",
            "gatewaySubscriptionId",
            "currentPeriodStart",
            "currentPeriodEnd",
            "cancelAtPeriodEnd",
            "cancelledAt",
            "createdAt",
            "updatedAt"
          )
          values (
            $10,
            $1,
            $2,
            $3::"SubscriptionStatus",
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            now(),
            now()
          )
          on conflict ("gatewaySubscriptionId") do update set
            "userId" = excluded."userId",
            "planId" = excluded."planId",
            status = excluded.status,
            "gatewayCustomerId" = excluded."gatewayCustomerId",
            "currentPeriodStart" = excluded."currentPeriodStart",
            "currentPeriodEnd" = excluded."currentPeriodEnd",
            "cancelAtPeriodEnd" = excluded."cancelAtPeriodEnd",
            "cancelledAt" = excluded."cancelledAt",
            "updatedAt" = now()
          returning id, status
        `,
        [
          userId,
          planId,
          localStatus,
          stripeCustomerId,
          subscription.id,
          currentPeriodStart,
          currentPeriodEnd,
          subscription.cancel_at_period_end,
          cancelledAt,
          subscriptionId,
        ],
      );

      await client.query(
        `
          update "Payment"
          set
            status = 'SUCCESS',
            "subscriptionId" = $1,
            "gatewayPaymentId" = coalesce($2, "gatewayPaymentId"),
            "updatedAt" = now()
          where id = $3
        `,
        [
          upserted.rows[0].id,
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
          payment.id,
        ],
      );

      await client.query("commit");

      repaired.push({
        paymentId: payment.id,
        subscriptionId: upserted.rows[0].id,
        subscriptionStatus: upserted.rows[0].status,
        stripeSubscriptionId: subscription.id,
      });
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }

  console.log(
    JSON.stringify(
      {
        repaired,
        skipped,
      },
      null,
      2,
    ),
  );

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
