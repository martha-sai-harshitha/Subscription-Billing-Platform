import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        priceInCents: "asc",
      },
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error("Plans fetch error:", error);

    return NextResponse.json(
      { error: "Unable to load pricing plans" },
      { status: 500 },
    );
  }
}