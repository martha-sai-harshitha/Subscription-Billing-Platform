import { CheckoutButton } from "@/components/checkout-button";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getFeatures(features: unknown): string[] {
  if (!Array.isArray(features)) {
    return [];
  }

  return features.filter(
    (feature): feature is string => typeof feature === "string",
  );
}

function formatPrice(priceInCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(priceInCents / 100);
}

export default async function PricingPage() {
  const plans = await prisma.plan.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      priceInCents: "asc",
    },
  });

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-indigo-400">
            Simple pricing
          </p>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Choose the plan that fits your needs
          </h1>

          <p className="mt-5 text-lg text-slate-400">
            Start today and change or cancel your subscription whenever you
            need.
          </p>
        </div>

        {plans.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
            <p className="text-slate-300">
              No pricing plans are currently available.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-3">
            {plans.map((plan) => {
              const features = getFeatures(plan.features);

              return (
                <article
                  key={plan.id}
                  className={`relative flex flex-col rounded-3xl border p-8 shadow-xl ${
                    plan.isPopular
                      ? "border-indigo-500 bg-slate-900 ring-2 ring-indigo-500"
                      : "border-slate-800 bg-slate-900"
                  }`}
                >
                  {plan.isPopular && (
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-indigo-500 px-4 py-1 text-sm font-semibold text-white">
                      Most Popular
                    </span>
                  )}

                  <div>
                    <h2 className="text-2xl font-bold">{plan.name}</h2>

                    <p className="mt-2 min-h-12 text-slate-400">
                      {plan.description}
                    </p>

                    <div className="mt-6 flex items-end gap-2">
                      <span className="text-4xl font-bold">
                        {formatPrice(plan.priceInCents, plan.currency)}
                      </span>

                      <span className="pb-1 text-slate-400">
                        /{plan.interval.toLowerCase()}
                      </span>
                    </div>
                  </div>

                  <ul className="my-8 flex-1 space-y-4">
                    {features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 text-slate-300"
                      >
                        <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-sm text-indigo-400">
                          ✓
                        </span>

                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <CheckoutButton
  planId={plan.id}
  planName={plan.name}
  isPopular={plan.isPopular}
/>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}