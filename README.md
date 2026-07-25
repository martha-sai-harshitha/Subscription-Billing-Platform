# Subscription Billing Platform

A full-stack subscription billing platform built with **Next.js**, **TypeScript**, **Prisma**, **PostgreSQL**, and **Stripe**. The application enables users to register, authenticate, subscribe to plans, manage subscriptions, and track payment history through a secure and scalable architecture.

---

# Objective

The objective of this project is to build a production-ready subscription billing platform that demonstrates secure authentication, subscription management, payment processing, and webhook integration using modern web technologies.

---

# Features

- User Registration
- Secure User Login
- JWT Authentication using HTTP-only Cookies
- Subscription Plans
- Stripe Checkout Integration
- Stripe Webhook Processing
- Subscription Management
- Payment History
- Invoice Management
- Responsive User Interface
- PostgreSQL Database
- Prisma ORM

---

# Tech Stack

| Layer | Technology |
|--------|------------|
| Frontend | Next.js 15 + React + TypeScript |
| Backend | Next.js API Routes |
| Styling | Tailwind CSS |
| Database | PostgreSQL (Neon) |
| ORM | Prisma |
| Authentication | JWT + HTTP-only Cookies |
| Payment Gateway | Stripe (Test Mode) |
| Email Notifications | Resend |

---

# Project Structure

```text
src/
│
├── app/
├── components/
├── lib/
├── generated/
├── middleware.ts
└── prisma/

prisma/
├── schema.prisma

public/

README.md
```

---

# Installation

Clone the repository

```bash
git clone <repository-url>
```

Navigate to the project

```bash
cd subscription-billing-platform
```

Install dependencies

```bash
npm install
```

---

# Environment Variables

Create a `.env` file in the project root.

```env
DATABASE_URL=

DIRECT_URL=

JWT_SECRET=

STRIPE_SECRET_KEY=

STRIPE_WEBHOOK_SECRET=

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

RESEND_API_KEY=

EMAIL_FROM=
```

---

# Database Setup

Generate Prisma Client

```bash
npx prisma generate
```

Run Database Migrations

```bash
npx prisma migrate deploy
```

(Optional for development)

```bash
npx prisma studio
```

---

# Running the Application

Development

```bash
npm run dev
```

Production

```bash
npm run build

npm start
```

---

# Stripe Configuration

Install Stripe CLI

```bash
stripe login
```

Start the webhook listener

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the generated webhook secret into

```env
STRIPE_WEBHOOK_SECRET=
```

---
# Email Notifications

The application supports transactional email notifications using **Resend**.

Notifications can be triggered for:

- Subscription Activated
- Payment Successful
- Payment Failed
- Subscription Cancelled
- Subscription Resumed
- Invoice Notification

Example configuration:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx

EMAIL_FROM=noreply@yourdomain.com
```

# Authentication Flow

1. User registers.
2. User logs in.
3. JWT token is generated.
4. Token is stored in an HTTP-only cookie.
5. Protected routes validate the JWT before allowing access.

---

# Subscription Flow

1. User selects a subscription plan.
2. A Stripe Checkout Session is created.
3. User completes payment through Stripe Checkout.
4. Stripe sends webhook events.
5. Subscription details are synchronized with the database.
6. Payment information is stored.
7. User can view subscription details from the dashboard.

---

# Database Models

- User
- Plan
- Subscription
- Payment
- Invoice
- WebhookEvent

---

# API Endpoints

## Authentication

- POST `/api/auth/register`
- POST `/api/auth/login`
- POST `/api/auth/logout`

## Plans

- GET `/api/plans`

## Checkout

- POST `/api/checkout`

## Subscription

- GET `/api/subscription`
- POST `/api/subscription/cancel`
- POST `/api/subscription/resume`

## Webhooks

- POST `/api/webhooks/stripe`

---

# Project Highlights

- Modern Next.js App Router Architecture
- Secure JWT Authentication
- Stripe Checkout Integration
- Stripe Webhook Processing
- Prisma ORM with PostgreSQL
- Transactional Email Notifications using Resend
- Responsive UI with Tailwind CSS
- Email Notification Delivery
- Modular and Scalable Code Structure

---

# Future Enhancements

- Email notifications using Resend
- Admin Dashboard
- Coupon and Discount Support
- Team Subscriptions
- Analytics Dashboard
- Multiple Payment Provider Support

---

# Testing

The following scenarios have been considered during development:

- User Registration
- User Login
- Subscription Checkout
- Stripe Webhook Processing
- Payment Success
- Payment Failure
- Subscription Cancellation
- Subscription Resumption
- Invoice Generation

---

# Author

**Sai Harshitha**

---

# License

This project was developed as part of a technical assessment for educational and evaluation purposes.