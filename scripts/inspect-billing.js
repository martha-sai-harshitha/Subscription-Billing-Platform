require("dotenv/config");

const { Client } = require("pg");

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  const payments = await client.query(`
    select
      id,
      status,
      "subscriptionId",
      "gatewayCheckoutSession",
      "gatewayPaymentId",
      "createdAt",
      "updatedAt"
    from "Payment"
    order by "createdAt" desc
    limit 10
  `);

  const subscriptions = await client.query(`
    select
      id,
      "userId",
      "planId",
      status,
      "gatewayCustomerId",
      "gatewaySubscriptionId",
      "currentPeriodStart",
      "currentPeriodEnd",
      "createdAt",
      "updatedAt"
    from "Subscription"
    order by "createdAt" desc
    limit 10
  `);

  const events = await client.query(`
    select
      "eventId",
      "eventType",
      status,
      "errorMessage",
      "processedAt",
      "createdAt"
    from "WebhookEvent"
    order by "createdAt" desc
    limit 20
  `);

  const columns = await client.query(`
    select
      table_name,
      column_name,
      data_type,
      is_nullable
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('Subscription', 'Payment', 'WebhookEvent', 'Plan')
    order by table_name, ordinal_position
  `);

  console.log(
    JSON.stringify(
      {
        payments: payments.rows,
        subscriptions: subscriptions.rows,
        events: events.rows,
        columns: columns.rows,
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
