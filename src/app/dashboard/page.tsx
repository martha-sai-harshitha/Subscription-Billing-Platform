import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: user.id,
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
    take: 5,
  });

  return (
    <main className="min-h-screen bg-slate-950 p-10 text-white">
      <div className="mx-auto max-w-5xl">

        <h1 className="text-4xl font-bold">
          Welcome, {user.name} 👋
        </h1>

        <p className="mt-2 text-slate-400">
          {user.email}
        </p>

        <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-6">

          <h2 className="text-2xl font-semibold">
            Current Subscription
          </h2>

          {subscription ? (
            <div className="mt-6 space-y-3">

              <p>
                <strong>Plan:</strong> {subscription.plan.name}
              </p>

              <p>
                <strong>Status:</strong> {subscription.status}
              </p>

              <p>
                <strong>Current Period End:</strong>{" "}
                {subscription.currentPeriodEnd
                  ? subscription.currentPeriodEnd.toLocaleDateString()
                  : "-"}
              </p>

            </div>
          ) : (
            <p className="mt-4 text-slate-400">
              No active subscription found.
            </p>
          )}
        </div>

        <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-6">

          <h2 className="mb-6 text-2xl font-semibold">
            Recent Payments
          </h2>

          <table className="w-full">

            <thead>

              <tr className="border-b border-slate-700">

                <th className="py-3 text-left">Amount</th>

                <th className="py-3 text-left">Status</th>

                <th className="py-3 text-left">Date</th>

              </tr>

            </thead>

            <tbody>

              {payments.map((payment) => (

                <tr
                  key={payment.id}
                  className="border-b border-slate-800"
                >

                  <td className="py-3">
                    ${(payment.amountInCents / 100).toFixed(2)}
                  </td>

                  <td className="py-3">
                    {payment.status}
                  </td>

                  <td className="py-3">
                    {payment.createdAt.toLocaleDateString()}
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>
    </main>
  );
}