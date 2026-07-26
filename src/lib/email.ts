import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const fromEmail =
  process.env.EMAIL_FROM ??
  "Audigo Billing <onboarding@resend.dev>";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000";

function formatDate(date?: Date | null): string {
  if (!date) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

function formatAmount(
  amountInCents: number,
  currency: string,
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountInCents / 100);
}

export async function sendSubscriptionConfirmedEmail({
  to,
  name,
  planName,
  renewalDate,
}: {
  to: string;
  name?: string | null;
  planName: string;
  renewalDate?: Date | null;
}) {
  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: [to],
    subject: `${planName} subscription confirmed`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Subscription confirmed</h2>

        <p>Hello ${name || "Customer"},</p>

        <p>
          Your <strong>${planName}</strong> subscription
          has been activated successfully.
        </p>

        <p>
          Your next renewal date is
          <strong>${formatDate(renewalDate)}</strong>.
        </p>

        <p>Thank you for using Audigo.</p>
      </div>
    `,
  });

  if (error) {
    console.error(
      "Resend subscription confirmation error:",
      error,
    );
    throw new Error(error.message);
  }

  return data;
}

export async function sendInvoiceEmail({
  to,
  name,
  planName,
  amountInCents,
  currency,
  invoiceNumber,
  invoiceUrl,
}: {
  to: string;
  name?: string | null;
  planName: string;
  amountInCents: number;
  currency: string;
  invoiceNumber: string;
  invoiceUrl?: string | null;
}) {
  const invoiceLink = invoiceUrl
    ? `
      <p>
        <a href="${invoiceUrl}">
          View or download invoice
        </a>
      </p>
    `
    : "";

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: [to],
    subject: `Payment successful - Invoice ${invoiceNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Payment successful</h2>

        <p>Hello ${name || "Customer"},</p>

        <p>
          We successfully received your payment for the
          <strong>${planName}</strong> plan.
        </p>

        <p>
          <strong>Invoice number:</strong>
          ${invoiceNumber}
        </p>

        <p>
          <strong>Amount paid:</strong>
          ${formatAmount(amountInCents, currency)}
        </p>

        ${invoiceLink}

        <p>Thank you for using Audigo.</p>
      </div>
    `,
  });

  if (error) {
    console.error("Resend invoice email error:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function sendPaymentFailedEmail({
  to,
  name,
  planName,
}: {
  to: string;
  name?: string | null;
  planName: string;
}) {
  const retryUrl = `${appUrl}/pricing`;

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: [to],
    subject: `Payment failed for ${planName}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Payment failed</h2>

        <p>Hello ${name || "Customer"},</p>

        <p>
          We were unable to process the payment for your
          <strong>${planName}</strong> subscription.
        </p>

        <p>
          Please review your payment details and try again.
        </p>

        <p>
          <a href="${retryUrl}">
            Retry payment
          </a>
        </p>

        <p>Thank you for using Audigo.</p>
      </div>
    `,
  });

  if (error) {
    console.error(
      "Resend payment failed email error:",
      error,
    );
    throw new Error(error.message);
  }

  return data;
}

export async function sendCancellationEmail({
  to,
  name,
  planName,
  accessEndDate,
}: {
  to: string;
  name?: string | null;
  planName: string;
  accessEndDate?: Date | null;
}) {
  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: [to],
    subject: `${planName} cancellation confirmed`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Cancellation confirmed</h2>

        <p>Hello ${name || "Customer"},</p>

        <p>
          Your <strong>${planName}</strong> subscription
          is scheduled for cancellation.
        </p>

        <p>
          You will continue to have access until
          <strong>${formatDate(accessEndDate)}</strong>.
        </p>

        <p>
          You can resume your subscription before this date.
        </p>

        <p>Thank you for using Audigo.</p>
      </div>
    `,
  });

  if (error) {
    console.error(
      "Resend cancellation email error:",
      error,
    );
    throw new Error(error.message);
  }

  return data;
}