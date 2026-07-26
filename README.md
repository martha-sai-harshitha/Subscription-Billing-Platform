# Subscription Billing Platform

A full-stack SaaS subscription billing application built with Next.js, Prisma, PostgreSQL, Stripe, and Resend.

<img width="1897" height="907" alt="image" src="https://github.com/user-attachments/assets/ced4c051-26e4-4543-b606-813310d7df80" />
<img width="1895" height="906" alt="image" src="https://github.com/user-attachments/assets/c9163976-c74b-4669-ad8e-4ef8286b5352" />

## Features

- User registration and login
- Pricing page with active subscription plans
- Stripe Checkout for first-time subscriptions
- Subscription dashboard
- Cancel subscription at the end of the billing period
- Resume a scheduled cancellation
- Upgrade or downgrade an existing subscription
- Stripe proration handling
- Payment and invoice history
- Downloadable Stripe invoice links
- Subscription confirmation emails
- Payment success and failure emails
- Stripe webhook signature verification
- Webhook idempotency using stored Stripe event IDs

## Technology Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** Next.js Route Handlers
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Payments:** Stripe
- **Email:** Resend
- **Deployment:** Vercel and Neon PostgreSQL

## Project Structure

```text
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   ├── checkout/
│   │   ├── subscription/
│   │   │   ├── cancel/
│   │   │   ├── resume/
│   │   │   └── change-plan/
│   │   └── webhooks/
│   │       └── stripe/
│   ├── dashboard/
│   ├── login/
│   ├── pricing/
│   └── register/
├── components/
│   ├── CheckoutButton.tsx
│   ├── ChangePlanButton.tsx
│   └── SubscriptionActions.tsx
├── generated/
│   └── prisma/
└── lib/
    ├── auth.ts
    ├── current-user.ts
    ├── email.ts
    ├── prisma.ts
    └── stripe.ts

prisma/
└── schema.prisma
```

## Prerequisites

- Node.js 20 or later
- npm
- PostgreSQL database
- Stripe account
- Stripe CLI
- Resend account

## Installation

Clone the repository and install dependencies:

```bash
git clone <your-repository-url>
cd <your-project-folder>
npm install
```

## Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
RESEND_API_KEY="re_..."
EMAIL_FROM="Subscription Platform <onboarding@resend.dev>"
AUTH_SECRET="replace-with-a-secure-random-secret"
```

*Do not commit the `.env` file to GitHub.*

## Database Setup

```bash
npx prisma generate
npx prisma migrate dev
npx prisma studio
```

## Stripe Plan Setup

Create products and recurring prices in Stripe. Save each Stripe Price ID in the corresponding Plan record.

Example plan data:
```text
name: Starter
description: Basic subscription plan
priceInCents: 999
currency: USD
interval: MONTHLY
stripePriceId: price_...
isActive: true
```

## Running the Application

```bash
npm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

## Stripe Webhook Setup

Authenticate the Stripe CLI:

```bash
stripe login
```

Forward events to the local webhook route:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the generated webhook secret into `.env`:

```env
STRIPE_WEBHOOK_SECRET="whsec_..."
```

*Restart the development server after changing environment variables.*

## Stripe Events Handled

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Webhook events are stored in the `WebhookEvent` table. The Stripe event ID is unique, which prevents duplicate processing.

## Subscription Flow

### New Subscription
1. The user selects a plan on the pricing page.
2. The application creates a Stripe Checkout Session.
3. The user completes payment in Stripe Checkout.
4. Stripe sends `checkout.session.completed`.
5. The webhook creates or updates the local subscription.
6. Payment and invoice records are saved.
7. Confirmation and invoice emails are sent.

### Cancel Subscription
1. The user clicks Cancel Subscription.
2. Stripe sets `cancel_at_period_end` to true.
3. The subscription remains active until the current billing period ends.

### Resume Subscription
1. The user clicks Resume Subscription.
2. Stripe sets `cancel_at_period_end` to false.
3. The subscription continues normally.

### Upgrade or Downgrade
1. The user selects another plan from the dashboard.
2. The application retrieves the existing Stripe subscription.
3. The existing subscription item price is replaced.
4. Stripe calculates the prorated amount.
5. Stripe creates and attempts to pay the prorated invoice.
6. Prisma is updated after Stripe successfully applies the change.
7. The dashboard refreshes and shows the new plan.

*The plan-change flow reuses the existing Stripe subscription. It does not create a second customer, Checkout Session, or subscription.*

### Proration Configuration
The plan-change route uses:
```text
proration_behavior: "always_invoice"
payment_behavior: "pending_if_incomplete"
```
This means Stripe immediately invoices the prorated difference. If payment fails, the current subscription remains active and the local database is not changed prematurely.

## Important API Routes

| Method | Route | Purpose |
| :--- | :--- | :--- |
| POST | `/api/auth/register` | Create a user account |
| POST | `/api/auth/login` | Authenticate a user |
| POST | `/api/auth/logout` | Sign out |
| POST | `/api/checkout` | Create the first Stripe Checkout Session |
| POST | `/api/subscription/cancel` | Schedule cancellation |
| POST | `/api/subscription/resume` | Resume a scheduled cancellation |
| POST | `/api/subscription/change-plan` | Upgrade or downgrade a plan |
| POST | `/api/webhooks/stripe` | Process Stripe events |

## Testing

Use Stripe's standard test card:
- **Card number:** `4242 4242 4242 4242`
- **Expiry date:** Any future date
- **CVC:** Any three digits
- **ZIP code:** Any valid value

### Test a New Subscription
1. Register or log in.
2. Open `/pricing`.
3. Select a plan.
4. Complete Stripe Checkout.
5. Confirm the subscription appears on `/dashboard`.
6. Verify Subscription, Payment, and Invoice records in Prisma Studio.

### Test Cancellation and Resume
1. Click Cancel Subscription.
2. Confirm `cancelAtPeriodEnd` becomes true.
3. Click Resume Subscription.
4. Confirm `cancelAtPeriodEnd` becomes false.

### Test Upgrade or Downgrade
1. Open the dashboard.
2. Select another plan.
3. Confirm the dashboard shows the new plan.
4. Confirm the same Stripe subscription ID is retained.
5. Confirm no duplicate local subscription is created.
6. Confirm `planId` changes in Prisma Studio.
7. Confirm a prorated invoice appears in Stripe.

## Build

```bash
npm run build
npm start
```

## Deployment

### Vercel
1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Add all environment variables.
4. Deploy the project.
5. Set `NEXT_PUBLIC_APP_URL` to the deployed URL.

Example:
```env
NEXT_PUBLIC_APP_URL="https://your-project.vercel.app"
```

### Production Stripe Webhook
Create this endpoint in Stripe:
```text
https://your-project.vercel.app/api/webhooks/stripe
```
Subscribe it to the same Stripe events listed above, then add the production webhook signing secret to the Vercel environment variables.

## Security

- Stripe webhook signatures are verified.
- Passwords are stored as hashes.
- Protected routes require authentication.
- Stripe secret keys remain server-side.
- Webhook events are processed idempotently.
- Plan IDs and Stripe Price IDs are validated on the server.
- Payment status is never trusted from the browser.

## Known Limitations

- Only one active subscription is expected per user.
- The project assumes one recurring item per Stripe subscription.
- Tax calculation is not included.
- Production email sending requires a verified Resend domain.
- Additional payment recovery UI may be needed for failed prorated plan changes.

## Future Improvements

- Stripe Customer Portal
- Annual plans
- Trial periods
- Coupons and discounts
- Tax calculation
- Admin dashboard
- Usage-based billing
- Role-based access control
- Automated integration tests
- Audit logs

## Useful Commands

```bash
npm install
npm run dev
npm run build
npm start

npx prisma generate
npx prisma migrate dev
npx prisma studio

stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## License

This project was developed as part of a technical assessment for educational and evaluation purposes.
