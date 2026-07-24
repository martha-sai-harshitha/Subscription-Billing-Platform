import { prisma } from "../src/lib/prisma";
import { BillingInterval } from "../src/generated/prisma/enums";

async function main() {
  const plans = [
    {
      name: "Starter",
      slug: "starter",
      description: "Perfect for individuals",
      priceInCents: 999,
      currency: "USD",
      interval: BillingInterval.MONTHLY,
      features: ["1 Project", "Email Support", "Basic Analytics"],
      isPopular: false,
    },
    {
      name: "Pro",
      slug: "pro",
      description: "Best for growing teams",
      priceInCents: 2999,
      currency: "USD",
      interval: BillingInterval.MONTHLY,
      features: [
        "Unlimited Projects",
        "Priority Support",
        "Advanced Analytics",
      ],
      isPopular: true,
    },
    {
      name: "Enterprise",
      slug: "enterprise",
      description: "For large organizations",
      priceInCents: 9999,
      currency: "USD",
      interval: BillingInterval.MONTHLY,
      features: [
        "Unlimited Everything",
        "Dedicated Manager",
        "Custom Integrations",
      ],
      isPopular: false,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
  }

  console.log("Plans seeded successfully.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });