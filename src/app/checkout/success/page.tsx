import Link from "next/link";

type SuccessPageProps = {
  searchParams: Promise<{
    session_id?: string;
  }>;
};

export default async function CheckoutSuccessPage({
  searchParams,
}: SuccessPageProps) {
  const { session_id: sessionId } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-10 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-3xl text-green-400">
          ✓
        </div>

        <h1 className="mt-6 text-3xl font-bold">
          Payment completed
        </h1>

        <p className="mt-4 text-slate-400">
          Thank you. Stripe has completed your checkout.
        </p>

        {sessionId && (
          <p className="mt-4 break-all text-xs text-slate-500">
            Checkout session: {sessionId}
          </p>
        )}

        <Link
          href="/dashboard"
          className="mt-8 inline-block rounded-xl bg-indigo-500 px-6 py-3 font-semibold hover:bg-indigo-400"
        >
          Go to dashboard
        </Link>
      </section>
    </main>
  );
}