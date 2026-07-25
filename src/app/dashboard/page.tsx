import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SubscriptionActions } from "@/components/subscription-actions";
import { LogoutButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";

function formatPrice(priceInCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(priceInCents / 100);
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(date));
}

function getStatusBadge(status: string, cancelAtPeriodEnd: boolean) {
  if (status === "ACTIVE") {
    if (cancelAtPeriodEnd) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          Active (Cancelling)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Active
      </span>
    );
  }
  if (status === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-400 border border-yellow-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
        Pending
      </span>
    );
  }
  if (status === "CANCELLED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-400 border border-slate-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
        Cancelled
      </span>
    );
  }
  if (status === "EXPIRED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-400 border border-rose-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        Expired
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-400 border border-slate-500/20">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
      {status}
    </span>
  );
}

function getPaymentStatusBadge(status: string) {
  switch (status) {
    case "SUCCESS":
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/15">
          Success
        </span>
      );
    case "PENDING":
      return (
        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/15">
          Pending
        </span>
      );
    case "FAILED":
      return (
        <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-400 border border-rose-500/15">
          Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-slate-400 border border-slate-500/15">
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

  const subscription = await prisma.subscription.findFirst({
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

  const payments = await prisma.payment.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 8,
  });

  return (
    <div className="relative min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden">
      {/* Background Gradient Orbs */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/30 via-slate-950 to-slate-950" />
      <div className="absolute top-0 right-1/4 -z-10 h-[300px] w-[300px] rounded-full bg-violet-600/10 blur-[100px]" />
      <div className="absolute bottom-10 left-1/4 -z-10 h-[350px] w-[350px] rounded-full bg-indigo-600/10 blur-[120px]" />

      {/* Navigation Header */}
      <header className="border-b border-slate-900 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent hover:opacity-90 transition">
              Adulgo
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/dashboard" className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition">
                Dashboard
              </Link>
              <Link href="/pricing" className="text-sm font-semibold text-slate-400 hover:text-slate-200 transition">
                Pricing
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* Welcome Section */}
        <section className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Welcome, {user.name} 👋
          </h1>
          <p className="mt-2 text-slate-400 text-base">
            {user.email} &bull; Manage your plan, billing periods, and transaction history.
          </p>
        </section>

        {/* Dashboard Cards Grid */}
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          {/* Left Column: Subscription details */}
          <section className="lg:col-span-7 space-y-8">
            <div className="rounded-3xl border border-slate-900 bg-slate-900/40 p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden group hover:border-slate-800 transition-all duration-300">
              <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-bl-full pointer-events-none" />
              
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/60 pb-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    Current Subscription
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Details on your subscription status & validity</p>
                </div>
                {subscription ? getStatusBadge(subscription.status, subscription.cancelAtPeriodEnd) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-400 border border-slate-500/20">
                    No Subscription
                  </span>
                )}
              </div>

              {subscription ? (
                <div className="mt-6 space-y-6">
                  {/* Plan Details Summary */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-950/40 rounded-2xl border border-slate-900/50 p-5">
                    <div>
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Plan Name</p>
                      <p className="text-lg font-bold text-slate-200 mt-1">{subscription.plan.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Pricing</p>
                      <p className="text-lg font-bold text-slate-200 mt-1">
                        {formatPrice(subscription.plan.priceInCents, subscription.plan.currency)}
                        <span className="text-xs font-normal text-slate-500">/{subscription.plan.interval.toLowerCase()}</span>
                      </p>
                    </div>
                  </div>

                  {/* Billing Period Details */}
                  <div className="space-y-4 border-t border-slate-800/40 pt-6">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Current Period</span>
                      <span className="font-semibold text-slate-200">
                        {formatDate(subscription.currentPeriodStart)} to {formatDate(subscription.currentPeriodEnd)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">
                        {subscription.status === "ACTIVE" && subscription.cancelAtPeriodEnd ? "Expiration Date" : "Renewal Date"}
                      </span>
                      <span className="font-semibold text-slate-200">
                        {formatDate(subscription.currentPeriodEnd)}
                      </span>
                    </div>

                    {subscription.cancelAtPeriodEnd && (
                      <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 mt-2">
                        <p className="text-sm text-amber-400">
                          Your subscription is set to cancel at the end of the current billing cycle on{" "}
                          <strong>{formatDate(subscription.currentPeriodEnd)}</strong>. No more payments will be processed.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions (Cancel/Resume) */}
                  <div className="border-t border-slate-800/40 pt-6">
                    <SubscriptionActions
                       
                      cancelAtPeriodEnd={subscription.cancelAtPeriodEnd}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-8 py-10 px-6 rounded-2xl bg-slate-950/20 border border-dashed border-slate-800 flex flex-col items-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-xl text-indigo-400 mb-4">
                    ✨
                  </div>
                  <h3 className="text-lg font-semibold text-slate-200">No active subscription</h3>
                  <p className="mt-2 text-sm text-slate-400 max-w-sm">
                    Unlock full access by selecting one of our premium plans. Start your journey today!
                  </p>
                  <Link
                    href="/pricing"
                    className="mt-6 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition duration-200"
                  >
                    View Pricing Plans
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* Right Column: Recent Payments list */}
          <section className="lg:col-span-5">
            <div className="rounded-3xl border border-slate-900 bg-slate-900/40 p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden group hover:border-slate-800 transition-all duration-300">
              <div className="flex flex-col border-b border-slate-800/60 pb-6">
                <h2 className="text-2xl font-bold tracking-tight">
                  Recent Payments
                </h2>
                <p className="text-sm text-slate-500 mt-1">Your recent transaction statements and status</p>
              </div>

              {payments.length > 0 ? (
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-slate-800/80 text-slate-500 font-semibold">
                        <th className="pb-3 text-left">Amount</th>
                        <th className="pb-3 text-center">Status</th>
                        <th className="pb-3 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-slate-800/10 transition">
                          <td className="py-3.5 font-semibold text-slate-200">
                            {formatPrice(payment.amountInCents, payment.currency)}
                          </td>
                          <td className="py-3.5 text-center">
                            {getPaymentStatusBadge(payment.status)}
                          </td>
                          <td className="py-3.5 text-right text-slate-400 text-xs">
                            {formatDate(payment.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-8 py-10 px-4 rounded-2xl bg-slate-950/20 border border-dashed border-slate-800 flex flex-col items-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-lg text-slate-500 mb-4 border border-slate-800">
                    💳
                  </div>
                  <h3 className="text-md font-semibold text-slate-300">No transactions yet</h3>
                  <p className="mt-1 text-xs text-slate-500 max-w-[240px]">
                    Your billing history will appear here once your payments are processed.
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