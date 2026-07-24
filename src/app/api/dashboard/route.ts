import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
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
      take: 10,
    });

    return Response.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            plan: {
              id: subscription.plan.id,
              name: subscription.plan.name,
              slug: subscription.plan.slug,
              priceInCents: subscription.plan.priceInCents,
              currency: subscription.plan.currency,
              interval: subscription.plan.interval,
            },
          }
        : null,
      payments: payments.map((payment) => ({
        id: payment.id,
        amountInCents: payment.amountInCents,
        currency: payment.currency,
        status: payment.status,
        createdAt: payment.createdAt,
      })),
    });
  } catch (error) {
    console.error("Dashboard API error:", error);

    return Response.json(
      { error: "Unable to load dashboard data" },
      { status: 500 },
    );
  }
}