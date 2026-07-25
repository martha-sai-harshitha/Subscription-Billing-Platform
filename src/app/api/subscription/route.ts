import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
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

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error("GET subscription error:", error);
    return NextResponse.json(
      { error: "Unable to retrieve subscription data" },
      { status: 500 },
    );
  }
}
