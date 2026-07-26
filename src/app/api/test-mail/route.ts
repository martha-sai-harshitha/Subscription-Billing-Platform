import { NextResponse } from "next/server";
import { sendInvoiceEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const result = await sendInvoiceEmail({
      to: "marthasaiharshitha23@gmail.com",
      name: "Harshitha",
      planName: "Pro",
      amountInCents: 2900,
      currency: "USD",
      invoiceNumber: "TEST-INV-001",
      invoiceUrl: null,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to send test email";

    console.error("Test email error:", error);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: 500,
      },
    );
  }
}