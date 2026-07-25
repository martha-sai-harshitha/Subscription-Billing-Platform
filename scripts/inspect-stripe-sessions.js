require("dotenv/config");

const { Client } = require("pg");
const Stripe = require("stripe");

async function main() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  const payments = await client.query(`
    select
      id,
      "gatewayCheckoutSession",
      status,
      "subscriptionId"
    from "Payment"
    where "gatewayCheckoutSession" is not null
    order by "createdAt" desc
    limit 5
  `);

  const sessions = [];

  for (const payment of payments.rows) {
    const session = await stripe.checkout.sessions.retrieve(
      payment.gatewayCheckoutSession,
    );

    sessions.push({
      localPaymentId: payment.id,
      localPaymentStatus: payment.status,
      localSubscriptionId: payment.subscriptionId,
      checkoutSession: session.id,
      checkoutStatus: session.status,
      paymentStatus: session.payment_status,
      mode: session.mode,
      hasSubscription: Boolean(session.subscription),
      subscriptionId:
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id ?? null,
      metadataKeys: Object.keys(session.metadata ?? {}),
    });
  }

  console.log(JSON.stringify({ sessions }, null, 2));

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
