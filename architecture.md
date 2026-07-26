# Subscription Billing Platform Architecture

## Overview

The Subscription Billing Platform is a full-stack web application built using **Next.js**, **TypeScript**, **Prisma ORM**, **PostgreSQL**, and **Stripe**. The system follows a modular architecture where the frontend communicates with backend API routes, which interact with the database and external payment services.

---

# High-Level Architecture

```text
                    +----------------------+
                    |      Web Browser     |
                    |  (Next.js Frontend)  |
                    +----------+-----------+
                               |
                               |
                               v
                    +----------------------+
                    |   Next.js API Routes |
                    +----------+-----------+
                               |
         +---------------------+----------------------+
         |                     |                      |
         |                     |                      |
         v                     v                      v
 +---------------+     +----------------+     +----------------+
 | Authentication|     | Subscription   |     | Stripe Payment |
 | JWT & Cookies |     | Business Logic |     | Integration     |
 +-------+-------+     +--------+-------+     +--------+--------+
         |                      |                       |
         +----------------------+-----------------------+
                                |
                                v
                       +-------------------+
                       |   Prisma ORM      |
                       +---------+---------+
                                 |
                                 v
                      +----------------------+
                      | PostgreSQL (Neon DB) |
                      +----------------------+
```

---

# Technology Stack

| Layer | Technology |
|--------|------------|
| Frontend | Next.js 15 + React |
| Backend | Next.js API Routes |
| Language | TypeScript |
| ORM | Prisma |
| Database | PostgreSQL (Neon) |
| Authentication | JWT + HTTP-only Cookies |
| Payments | Stripe |
| Styling | Tailwind CSS |
| Notifications | Resend (Planned) |

---

# Application Flow

## User Authentication

```text
User
   │
   ▼
Login Request
   │
   ▼
Validate Credentials
   │
   ▼
Generate JWT
   │
   ▼
Store HTTP-only Cookie
   │
   ▼
Authenticated Session
```

---

## Subscription Flow

```text
User
   │
   ▼
Select Plan
   │
   ▼
Create Stripe Checkout Session
   │
   ▼
Stripe Checkout
   │
   ▼
Payment Successful
   │
   ▼
Stripe Webhook
   │
   ▼
Update Subscription
   │
   ▼
Update Payment
   │
   ▼
Dashboard
```

---

# Components

## Frontend

- Landing Page
- Login Page
- Dashboard
- Pricing Page
- Subscription Management
- Payment History

---

## Backend APIs

### Authentication

- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout

### Subscription

- GET /api/subscription
- POST /api/subscription/cancel
- POST /api/subscription/resume

### Checkout

- POST /api/checkout

### Plans

- GET /api/plans

### Stripe

- POST /api/webhooks/stripe

---

# Database Design

The application uses PostgreSQL with Prisma ORM.

Main entities:

- User
- Plan
- Subscription
- Payment
- Invoice
- WebhookEvent

Relationship overview:

```text
User
 │
 ├───< Subscription >──── Plan
 │
 └───< Payment

Payment
 │
 └── Invoice
```

---

# Security

- JWT Authentication
- HTTP-only Cookies
- Password Hashing
- Stripe Webhook Signature Verification
- Protected API Routes
- Prisma ORM for safe database access

---

# Stripe Integration

Stripe is responsible for payment processing and subscription lifecycle events.

Supported events:

- checkout.session.completed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded
- invoice.payment_failed

---

# Project Structure

```text
src/
├── app/
│   ├── api/
│   ├── dashboard/
│   ├── login/
│   └── pricing/
│
├── components/
├── generated/
├── lib/
├── middleware.ts
│
prisma/
│   └── schema.prisma
│
public/
```

---

# Future Enhancements

- Email notifications using Resend
- Admin dashboard
- Coupon management
- Team subscriptions
- Usage-based billing
- Analytics dashboard
- Multiple payment gateways

---

# Design Principles

- Modular Architecture
- Separation of Concerns
- Secure Authentication
- Scalable API Design
- Event-Driven Payment Processing
- Database Transaction Consistency
- Maintainable Codebase

---

# Conclusion

The Subscription Billing Platform demonstrates a modern SaaS architecture using Next.js, Prisma, PostgreSQL, JWT authentication, and Stripe payment processing. The design focuses on scalability, maintainability, and secure subscription management while providing a clean foundation for future enhancements.
