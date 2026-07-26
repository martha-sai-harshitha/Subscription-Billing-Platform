import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SubscriptionActions } from "@/components/subscription-actions";
import { LogoutButton } from "@/components/logout-button";
import { ChangePlanButton } from "@/components/ChangePlanButton";

export const dynamic = "force-dynamic";

function formatPrice(
  priceInCents: number,
  currency: string,
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(priceInCents / 100);
}

function formatDate(
  date: Date | null | undefined,
): string {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(date));
}

function getStatusBadge(
  status: string,
  cancelAtPeriodEnd: boolean,
) {
  if (status === "ACTIVE") {
    if (cancelAtPeriodEnd) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
          Active (Cancelling)
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
        Active
      </span>
    );
  }

  if (status === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-400">
        <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
        Pending
      </span>
    );
  }

  if (status === "CANCELLED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-500/20 bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-400">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
        Cancelled
      </span>
    );
  }

  if (status === "EXPIRED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-400">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        Expired
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-500/20 bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-400">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
      {status}
    </span>
  );
}

function getPaymentStatusBadge(status: string) {
  switch (status) {
    case "SUCCESS":
      return (
        <span className="inline-flex items-center rounded-full border border-emerald-500/15 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
          Success
        </span>
      );

    case "PENDING":
      return (
        <span className="inline-flex items-center rounded-full border border-amber-500/15 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
          Pending
        </span>
      );

    case "FAILED":
      return (
        <span className="inline-flex items-center rounded-full border border-rose-500/15 bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-400">
          Failed
        </span>
      );

    default:
      return (
        <span className="inline-flex items-center rounded-full border border-slate-500/15 bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-slate-400">
          {status}
        </span>
      );
  }
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  const subscription =
    await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: {
          in: ["ACTIVE", "PENDING"],
        },
      },

      include: {
        plan: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

  const plans = await prisma.plan.findMany({
    where: {
      isActive: true,
    },

    orderBy: {
      priceInCents: "asc",
    },
  });

  const payments =
    await prisma.payment.findMany({
      where: {
        userId: user.id,
      },

      orderBy: {
        createdAt: "desc",
      },

      take: 8,
    });

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950 font-sans text-white">
      {/* Background */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/30 via-slate-950 to-slate-950" />

      <div className="absolute right-1/4 top-0 -z-10 h-[300px] w-[300px] rounded-full bg-violet-600/10 blur-[100px]" />

      <div className="absolute bottom-10 left-1/4 -z-10 h-[350px] w-[350px] rounded-full bg-indigo-600/10 blur-[120px]" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-900 bg-slate-950/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Link
              href="/dashboard"
              className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-xl font-bold text-transparent transition hover:opacity-90"
            >
              Audigo
            </Link>

            <nav className="hidden items-center gap-6 md:flex">
              <Link
                href="/dashboard"
                className="text-sm font-semibold text-indigo-400 transition hover:text-indigo-300"
              >
                Dashboard
              </Link>

              <Link
                href="/pricing"
                className="text-sm font-semibold text-slate-400 transition hover:text-slate-200"
              >
                Pricing
              </Link>
            </nav>
          </div>

          <LogoutButton />
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* Welcome */}
        <section className="mb-10">
          <h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            Welcome, {user.name || "Customer"} 👋
          </h1>

          <p className="mt-2 text-base text-slate-400">
            {user.email} &bull; Manage your plan,
            billing periods, and transaction history.
          </p>
        </section>

        <div className="grid items-start gap-8 lg:grid-cols-12">
          {/* Left column */}
          <section className="space-y-8 lg:col-span-7">
            {/* Current subscription */}
            <div className="group relative overflow-hidden rounded-3xl border border-slate-900 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-slate-800">
              <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-gradient-to-br from-indigo-500/10 to-transparent" />

              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/60 pb-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    Current Subscription
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Details about your subscription
                    status and validity
                  </p>
                </div>

                {subscription ? (
                  getStatusBadge(
                    subscription.status,
                    subscription.cancelAtPeriodEnd,
                  )
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-500/20 bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-400">
                    No Subscription
                  </span>
                )}
              </div>

              {subscription ? (
                <div className="mt-6 space-y-6">
                  {/* Plan summary */}
                  <div className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-900/50 bg-slate-950/40 p-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Plan Name
                      </p>

                      <p className="mt-1 text-lg font-bold text-slate-200">
                        {subscription.plan.name}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Pricing
                      </p>

                      <p className="mt-1 text-lg font-bold text-slate-200">
                        {formatPrice(
                          subscription.plan
                            .priceInCents,
                          subscription.plan.currency,
                        )}

                        <span className="text-xs font-normal text-slate-500">
                          /
                          {subscription.plan.interval.toLowerCase()}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Billing period */}
                  <div className="space-y-4 border-t border-slate-800/40 pt-6">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-slate-400">
                        Current Period
                      </span>

                      <span className="text-right font-semibold text-slate-200">
                        {formatDate(
                          subscription.currentPeriodStart,
                        )}{" "}
                        to{" "}
                        {formatDate(
                          subscription.currentPeriodEnd,
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-slate-400">
                        {subscription.status ===
                          "ACTIVE" &&
                        subscription.cancelAtPeriodEnd
                          ? "Expiration Date"
                          : "Renewal Date"}
                      </span>

                      <span className="font-semibold text-slate-200">
                        {formatDate(
                          subscription.currentPeriodEnd,
                        )}
                      </span>
                    </div>

                    {subscription.cancelAtPeriodEnd ? (
                      <div className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                        <p className="text-sm text-amber-400">
                          Your subscription is set to
                          cancel at the end of the current
                          billing cycle on{" "}
                          <strong>
                            {formatDate(
                              subscription.currentPeriodEnd,
                            )}
                          </strong>
                          . No additional recurring payments
                          will be processed.
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {/* Cancel / Resume */}
                  <div className="border-t border-slate-800/40 pt-6">
                    <SubscriptionActions
                      cancelAtPeriodEnd={
                        subscription.cancelAtPeriodEnd
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/20 px-6 py-10 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-xl text-indigo-400">
                    ✨
                  </div>

                  <h3 className="text-lg font-semibold text-slate-200">
                    No active subscription
                  </h3>

                  <p className="mt-2 max-w-sm text-sm text-slate-400">
                    Unlock full access by selecting one
                    of our available subscription plans.
                  </p>

                  <Link
                    href="/pricing"
                    className="mt-6 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-500/20 transition duration-200 hover:from-indigo-400 hover:to-violet-400 hover:shadow-indigo-500/30"
                  >
                    View Pricing Plans
                  </Link>
                </div>
              )}
            </div>

            {/* Change plan */}
            {subscription ? (
              <div className="rounded-3xl border border-slate-900 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl">
                <div className="border-b border-slate-800/60 pb-6">
                  <h2 className="text-2xl font-bold tracking-tight">
                    Upgrade or Downgrade
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Change your current subscription plan
                  </p>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {plans.map((plan) => {
                    const isCurrentPlan =
                      plan.id === subscription.planId;

                    const changeType:
                      | "upgrade"
                      | "downgrade" =
                      plan.priceInCents >
                      subscription.plan.priceInCents
                        ? "upgrade"
                        : "downgrade";

                    return (
                      <div
                        key={plan.id}
                        className={
                          isCurrentPlan
                            ? "rounded-2xl border border-indigo-500/40 bg-indigo-500/10 p-5"
                            : "rounded-2xl border border-slate-800 bg-slate-950/30 p-5 transition hover:border-slate-700"
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-bold text-slate-100">
                              {plan.name}
                            </h3>

                            {plan.description ? (
                              <p className="mt-1 text-sm text-slate-500">
                                {plan.description}
                              </p>
                            ) : null}
                          </div>

                          {isCurrentPlan ? (
                            <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-300">
                              Current
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-5">
                          <span className="text-2xl font-bold text-white">
                            {formatPrice(
                              plan.priceInCents,
                              plan.currency,
                            )}
                          </span>

                          <span className="text-sm text-slate-500">
                            /
                            {plan.interval.toLowerCase()}
                          </span>
                        </div>

                        <div className="mt-5">
                          {isCurrentPlan ? (
                            <button
                              type="button"
                              disabled
                              className="w-full cursor-not-allowed rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm font-semibold text-slate-400"
                            >
                              Current Plan
                            </button>
                          ) : (
                            <ChangePlanButton
                              planId={plan.id}
                              planName={plan.name}
                              changeType={changeType}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {plans.length <= 1 ? (
                  <p className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300">
                    Add more active plans in your database
                    to test upgrade and downgrade.
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>

          {/* Right column */}
          <section className="lg:col-span-5">
            <div className="group relative overflow-hidden rounded-3xl border border-slate-900 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-slate-800">
              <div className="flex flex-col border-b border-slate-800/60 pb-6">
                <h2 className="text-2xl font-bold tracking-tight">
                  Recent Payments
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Your recent transactions and payment
                  status
                </p>
              </div>

              {payments.length > 0 ? (
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-800/80 font-semibold text-slate-500">
                        <th className="pb-3 text-left">
                          Amount
                        </th>

                        <th className="pb-3 text-center">
                          Status
                        </th>

                        <th className="pb-3 text-right">
                          Date
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-800/40">
                      {payments.map((payment) => (
                        <tr
                          key={payment.id}
                          className="transition hover:bg-slate-800/10"
                        >
                          <td className="py-3.5 font-semibold text-slate-200">
                            {formatPrice(
                              payment.amountInCents,
                              payment.currency,
                            )}
                          </td>

                          <td className="py-3.5 text-center">
                            {getPaymentStatusBadge(
                              payment.status,
                            )}
                          </td>

                          <td className="py-3.5 text-right text-xs text-slate-400">
                            {formatDate(
                              payment.createdAt,
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/20 px-4 py-10 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-lg text-slate-500">
                    💳
                  </div>

                  <h3 className="text-md font-semibold text-slate-300">
                    No transactions yet
                  </h3>

                  <p className="mt-1 max-w-[240px] text-xs text-slate-500">
                    Your billing history will appear here
                    after payments are processed.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}