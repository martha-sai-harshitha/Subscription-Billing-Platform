import Link from "next/link";

const features = [
  {
    title: "Simple subscriptions",
    description:
      "Launch monthly and yearly plans with secure Stripe-powered checkout.",
    icon: "↗",
  },
  {
    title: "Reliable billing",
    description:
      "Track payments, renewals, failed transactions, and subscription status.",
    icon: "✓",
  },
  {
    title: "Customer dashboard",
    description:
      "Give customers a clean place to view plans, payments, and billing dates.",
    icon: "⌘",
  },
];

const steps = [
  {
    number: "01",
    title: "Choose a plan",
    description: "Select the subscription that matches your business needs.",
  },
  {
    number: "02",
    title: "Complete checkout",
    description: "Pay securely through Stripe Checkout in test or live mode.",
  },
  {
    number: "03",
    title: "Manage billing",
    description: "View your active plan, renewal date, and payment history.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-x-0 top-0 -z-0 h-[620px] bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.24),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.16),_transparent_30%)]" />

      <header className="relative z-10 border-b border-white/10">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-lg font-bold shadow-lg shadow-indigo-500/30">
              P
            </span>

            <div>
              <p className="font-semibold tracking-tight">Prexima Billing</p>
              <p className="text-xs text-slate-400">Subscription platform</p>
            </div>
          </Link>

          <div className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
            <Link href="#features" className="transition hover:text-white">
              Features
            </Link>

            <Link href="#how-it-works" className="transition hover:text-white">
              How it works
            </Link>

            <Link href="/pricing" className="transition hover:text-white">
              Pricing
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-xl px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white sm:block"
            >
              Sign in
            </Link>

            <Link
              href="/pricing"
              className="rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400"
            >
              View plans
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative z-10">
        <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 py-24 lg:grid-cols-2 lg:px-8 lg:py-32">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-4 py-2 text-sm text-indigo-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Secure subscription billing made simple
            </div>

            <h1 className="max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Billing that helps your business{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-sky-400 bg-clip-text text-transparent">
                grow with confidence.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-400 sm:text-xl">
              Create plans, accept recurring payments, manage subscriptions,
              and give customers a complete billing dashboard—all in one
              platform.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-6 py-3.5 font-semibold shadow-xl shadow-indigo-500/25 transition hover:-translate-y-0.5 hover:bg-indigo-400"
              >
                Start with a plan
                <span className="ml-2">→</span>
              </Link>

              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 font-semibold text-slate-200 transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                Open dashboard
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-400">
              <span className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                Secure checkout
              </span>

              <span className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                Cancel anytime
              </span>

              <span className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                Real-time status
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 rounded-full bg-indigo-500/10 blur-3xl" />

            <div className="relative rounded-[32px] border border-white/10 bg-white/[0.06] p-3 shadow-2xl backdrop-blur-xl">
              <div className="rounded-[26px] border border-white/10 bg-slate-900 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Current subscription</p>
                    <h2 className="mt-1 text-2xl font-bold">Pro Plan</h2>
                  </div>

                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-medium text-emerald-400">
                    Active
                  </span>
                </div>

                <div className="mt-8 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-6 shadow-xl shadow-indigo-500/20">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-indigo-100">
                        Monthly subscription
                      </p>

                      <p className="mt-3 text-4xl font-bold">
                        $29.99
                        <span className="ml-1 text-base font-medium text-indigo-100">
                          /month
                        </span>
                      </p>
                    </div>

                    <span className="rounded-xl bg-white/15 px-3 py-2 text-sm">
                      PRO
                    </span>
                  </div>

                  <div className="mt-8 flex items-center justify-between border-t border-white/20 pt-5 text-sm">
                    <span className="text-indigo-100">Next billing date</span>
                    <span className="font-semibold">24 Aug 2026</span>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold">Recent payments</h3>
                    <span className="text-sm text-indigo-400">View all</span>
                  </div>

                  <div className="space-y-3">
                    {[
                      ["Pro subscription", "$29.99", "Successful"],
                      ["Starter subscription", "$9.99", "Successful"],
                    ].map(([label, amount, status]) => (
                      <div
                        key={`${label}-${amount}`}
                        className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-4"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
                            $
                          </span>

                          <div>
                            <p className="text-sm font-medium">{label}</p>
                            <p className="text-xs text-slate-500">
                              24 July 2026
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-semibold">{amount}</p>
                          <p className="text-xs text-emerald-400">{status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="relative z-10 border-y border-white/10 bg-white/[0.02]"
      >
        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-400">
              Platform features
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything needed for modern subscription billing
            </h2>

            <p className="mt-5 text-lg text-slate-400">
              Built to keep payments simple for customers and manageable for
              your business.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-3xl border border-white/10 bg-slate-900/70 p-7 transition hover:-translate-y-1 hover:border-indigo-400/40"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-xl font-bold text-indigo-400">
                  {feature.icon}
                </span>

                <h3 className="mt-6 text-xl font-semibold">{feature.title}</h3>

                <p className="mt-3 leading-7 text-slate-400">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="relative z-10">
        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-400">
                How it works
              </p>

              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                From plan selection to subscription management
              </h2>

              <p className="mt-5 text-lg leading-8 text-slate-400">
                A clear and secure billing journey designed for SaaS customers.
              </p>
            </div>

            <div className="space-y-5">
              {steps.map((step) => (
                <article
                  key={step.number}
                  className="flex gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6"
                >
                  <span className="text-sm font-bold text-indigo-400">
                    {step.number}
                  </span>

                  <div>
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="mt-2 text-slate-400">{step.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 pb-24 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[32px] border border-indigo-400/20 bg-gradient-to-r from-indigo-500/20 via-violet-500/15 to-sky-500/20 px-8 py-14 text-center sm:px-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to simplify subscription billing?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
            Choose a plan, complete secure checkout, and manage everything from
            your personal dashboard.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/pricing"
              className="rounded-xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:bg-slate-100"
            >
              Explore pricing
            </Link>

            <Link
              href="/login"
              className="rounded-xl border border-white/15 px-6 py-3 font-semibold transition hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>© 2026 Prexima Crafts. All rights reserved.</p>

          <div className="flex gap-6">
            <Link href="/pricing" className="transition hover:text-slate-300">
              Pricing
            </Link>

            <Link href="/login" className="transition hover:text-slate-300">
              Login
            </Link>

            <Link href="/dashboard" className="transition hover:text-slate-300">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}