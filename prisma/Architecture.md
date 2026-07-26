Architecture

1. Overview

This project is a full-stack SaaS subscription billing platform built with Next.js, TypeScript, Prisma, PostgreSQL, Stripe, and Resend.

The application follows a server-centric architecture. The browser is responsible for user interaction, while sensitive operations such as authentication, subscription management, payment processing, and webhook handling run on the server.

2. High-Level Architecture

┌──────────────────────┐
│      Web Browser     │
│  Next.js React UI    │
└──────────┬───────────┘
           │ HTTPS
           ▼
┌────────────────────────────────────┐
│          Next.js Application       │
│                                    │
│  Pages and Server Components       │
│  Client Components                 │
│  Route Handlers                    │
│  Authentication                    │
│  Subscription Business Logic       │
└───────┬───────────────┬────────────┘
        │               │
        │ Prisma        │ Stripe SDK
        ▼               ▼
┌───────────────┐   ┌──────────────────┐
│ PostgreSQL    │   │ Stripe           │
│ Neon Database│   │ Customers         │
│               │   │ Checkout          │
│ Users         │   │ Subscriptions     │
│ Plans         │   │ Payments          │
│ Subscriptions │   │ Invoices          │
│ Payments      │   │ Webhooks          │
│ Invoices      │   └─────────┬────────┘
│ WebhookEvents │             │
└───────────────┘             │ Webhook events
                              ▼
                    ┌──────────────────────┐
                    │ Stripe Webhook Route │
                    │ Signature validation │
                    │ Idempotent processing│
                    │ Database sync        │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Resend Email Service │
                    │ Confirmation emails  │
                    │ Invoice emails       │
                    │ Failure alerts       │
                    └──────────────────────┘

3. Main Components

3.1 Frontend

The frontend is implemented using Next.js and React.

Main pages:

/
├── pricing
├── login
├── register
└── dashboard

Main client components:

CheckoutButton
ChangePlanButton
SubscriptionActions

Responsibilities:

Display available plans

Start Stripe Checkout

Display the current subscription

Cancel or resume a subscription

Upgrade or downgrade plans

Display payment and invoice history

Show loading and error states

The frontend never directly calls Stripe using a secret key. It communicates with protected Next.js API routes.

3.2 Backend

The backend uses Next.js Route Handlers.

Important routes:

POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/checkout
POST /api/subscription/cancel
POST /api/subscription/resume
POST /api/subscription/change-plan
POST /api/webhooks/stripe

Responsibilities:

Validate authenticated users

Validate request data

Read and write database records

Create Stripe Checkout Sessions

Update existing Stripe subscriptions

Cancel and resume subscriptions

Verify Stripe webhook signatures

Process Stripe events

Send transactional emails

4. Authentication Architecture

Authentication is handled by server-side utilities.

User submits credentials
        │
        ▼
Authentication route
        │
        ├── Validate email and password
        ├── Compare password hash
        ├── Create signed session or auth cookie
        └── Return authenticated response

Protected API routes call:

getCurrentUser()

If no valid user session is found, the route returns:

401 Unauthorized

Passwords are stored only as hashes in the database.

5. Database Architecture

Prisma is used as the ORM and PostgreSQL is used as the database.

5.1 Main Models

User

Stores account and Stripe customer information.

Important fields:

id
name
email
passwordHash
stripeCustomerId

Relationships:

User 1 ──── * Subscription
User 1 ──── * Payment

Plan

Stores the application subscription plans.

Important fields:

id
name
description
priceInCents
currency
interval
stripePriceId
isActive

Each plan is linked to a recurring Stripe Price.

Subscription

Stores the local representation of a Stripe subscription.

Important fields:

id
userId
planId
status
gatewayCustomerId
gatewaySubscriptionId
currentPeriodStart
currentPeriodEnd
cancelAtPeriodEnd
cancelledAt

Relationships:

Subscription * ──── 1 User
Subscription * ──── 1 Plan
Subscription 1 ──── * Payment

Payment

Stores successful, pending, or failed payments.

Important fields:

id
userId
subscriptionId
gatewayCheckoutSession
gatewayPaymentId
amountInCents
currency
status
failureReason

Invoice

Stores invoice information associated with a payment.

Important fields:

id
invoiceNumber
paymentId
amountInCents
currency
pdfUrl
issuedAt

WebhookEvent

Stores Stripe webhook event processing information.

Important fields:

eventId
eventType
status
payload
processedAt
errorMessage

The Stripe event ID is unique, which prevents duplicate event processing.

6. Initial Checkout Flow

User selects plan
        │
        ▼
POST /api/checkout
        │
        ├── Authenticate user
        ├── Validate plan
        ├── Create or reuse Stripe customer
        ├── Create pending payment record
        └── Create Stripe Checkout Session
        │
        ▼
User completes Stripe Checkout
        │
        ▼
Stripe sends checkout.session.completed
        │
        ▼
POST /api/webhooks/stripe
        │
        ├── Verify webhook signature
        ├── Retrieve Stripe subscription
        ├── Save Stripe customer ID
        ├── Create or update local subscription
        ├── Update payment record
        └── Mark webhook event processed

The browser redirect after Checkout is not treated as proof of payment. Stripe webhook events are the source of truth.

7. Webhook Architecture

The webhook endpoint is:

POST /api/webhooks/stripe

7.1 Signature Verification

The raw request body and the stripe-signature header are used to verify the event.

stripe.webhooks.constructEvent(
  rawBody,
  signature,
  webhookSecret,
)

Invalid signatures return:

400 Invalid webhook signature

7.2 Idempotency

Before processing an event, the application creates a WebhookEvent record.

New event
   │
   ├── eventId does not exist → process event
   │
   └── eventId already exists
          │
          ├── PROCESSED → return duplicate response
          └── FAILED or PROCESSING → retry processing

This prevents duplicate payments, invoices, and emails when Stripe retries a webhook.

7.3 Supported Stripe Events

checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed

7.4 Subscription Synchronization

A shared syncSubscription function maps Stripe subscription data to the local database.

It synchronizes:

status
customer ID
subscription ID
plan
billing period
cancel-at-period-end state
cancellation timestamp

8. Upgrade and Downgrade Architecture

Plan changes update the existing Stripe subscription.

User selects another plan
        │
        ▼
POST /api/subscription/change-plan
        │
        ├── Authenticate user
        ├── Validate new plan
        ├── Load active local subscription
        ├── Retrieve Stripe subscription
        ├── Retrieve current subscription item
        └── Replace current Stripe Price
        │
        ▼
Stripe calculates proration
        │
        ├── Upgrade → charge prorated difference
        └── Downgrade → apply credit or adjustment
        │
        ▼
Stripe applies subscription update
        │
        ▼
Local subscription plan is updated
        │
        ▼
Webhook confirms payment and invoice state

The update uses:

proration_behavior: "always_invoice"
payment_behavior: "pending_if_incomplete"

This design provides the following behavior:

The existing Stripe subscription is reused.

No second customer is created.

No second subscription is created.

Stripe immediately generates a prorated invoice.

If required payment cannot be completed, the current plan remains active.

Prisma is updated only after Stripe applies the change.

9. Cancellation and Resume Flow

Cancel

User clicks Cancel
        │
        ▼
POST /api/subscription/cancel
        │
        ▼
Stripe sets cancel_at_period_end = true
        │
        ▼
Local subscription is updated

The subscription remains usable until the current billing period ends.

Resume

User clicks Resume
        │
        ▼
POST /api/subscription/resume
        │
        ▼
Stripe sets cancel_at_period_end = false
        │
        ▼
Local subscription is updated

10. Invoice and Payment Flow

When Stripe sends invoice.paid:

Stripe invoice event
        │
        ▼
Find local subscription
        │
        ▼
Create or update Payment
        │
        ▼
Create or update Invoice
        │
        ├── Store amount
        ├── Store currency
        ├── Store invoice number
        └── Store invoice PDF URL
        │
        ▼
Send confirmation and invoice emails

When Stripe sends invoice.payment_failed:

Create or update failed Payment
        │
        ├── status = FAILED
        └── save failure reason
        │
        ▼
Send payment failure email

11. Email Architecture

Transactional emails are sent through Resend.

Email functions are isolated in:

src/lib/email.ts

Supported notifications:

Subscription confirmation
Successful invoice payment
Failed payment
Subscription cancellation

Email failures are logged but do not cause the Stripe webhook to lose payment data.

12. Error Handling

Each API route uses structured error responses.

Typical response format:

{
  "error": "Description of the error"
}

Common status codes:

400 Invalid request
401 Unauthorized
404 Resource not found
402 Payment required
500 Internal server error

Webhook processing failures are stored in the WebhookEvent table for debugging and retry support.

13. Security

The architecture includes the following protections:

Stripe secret keys are used only on the server.

Webhook signatures are verified.

Protected routes require authentication.

Passwords are hashed.

Stripe event IDs are processed idempotently.

Plan IDs are validated on the server.

Stripe Price IDs are loaded from the database.

Payment success is determined from Stripe events, not browser redirects.

Database updates are wrapped in transactions where related records must remain consistent.

Environment variables are not committed to source control.

14. Environment Configuration

Required environment variables:

DATABASE_URL="postgresql://..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"

STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

RESEND_API_KEY="re_..."
EMAIL_FROM="Subscription Platform <onboarding@resend.dev>"

AUTH_SECRET="secure-random-value"

15. Deployment Architecture

GitHub Repository
        │
        ▼
Vercel
        │
        ├── Next.js frontend
        ├── Server components
        └── API route handlers
        │
        ├──────────────► Neon PostgreSQL
        │
        ├──────────────► Stripe API
        │
        └──────────────► Resend API

Production Stripe webhooks point to:

https://your-domain.com/api/webhooks/stripe

16. Design Decisions

Stripe as the Billing Source of Truth

Stripe owns the authoritative billing state.

The local database stores a synchronized representation for:

Fast dashboard queries

Reporting

Payment history

Invoice history

Application authorization

Webhooks Instead of Redirect-Based Confirmation

A user may close the browser before returning from Stripe Checkout. Webhooks provide reliable server-to-server confirmation.

Existing Subscription Update for Plan Changes

Upgrade and downgrade operations modify the existing subscription item instead of creating another subscription. This prevents duplicate subscriptions and allows Stripe to calculate prorations correctly.

Idempotent Webhook Processing

Stripe can deliver the same event multiple times. Storing each unique event ID prevents duplicate business actions.

Server-Side Payment Operations

All Stripe mutations run in server routes. The browser never receives Stripe secret credentials.

17. Current Limitations

One active subscription is expected per user.

One recurring item is expected per Stripe subscription.

Tax calculation is not implemented.

Usage-based billing is not implemented.

Failed plan-change payments may require an additional recovery interface.

Production email delivery requires a verified sender domain.

The current design does not include an administrative dashboard.

18. Future Architecture Improvements

Stripe Customer Portal

Annual and monthly billing options

Trial management

Coupon and promotion management

Tax calculation

Role-based access control

Admin reporting dashboard

Usage-based billing

Automated integration tests

Queue-based email processing

Structured application logging

Monitoring and alerting

Audit history for subscription changes