This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Prisma

---

rm -rf prisma/migrations
npx prisma migrate reset
npx prisma migrate dev --name init
npx prisma generate

# To seed the database (Write/adjust seed before)

npx tsx ./db/seed

---

# Add Prisma migration

npx prisma migrate dev --name add-cart

# To open Prisma Studio

npx prisma studio

# Manage page

How the User Management Page Works
This page allows you to view and manage all users in the application, with a special focus on blocking/unblocking them. Here's how it works in simple terms:

Main Features
User List Display: Shows a table with all users from the database, including:

Profile image (or initial if no image)
Name
Email
Role (admin or user) with color coding
Join date
Blocking status with a toggle switch
User Blocking System:

Each user has a toggle switch in the "Blocked" column
Gray switch = User is NOT blocked (can use the system)
Red switch = User IS blocked (can't access the system)
When you click the switch, it instantly changes color and updates the database
How It Works Behind the Scenes
Data Loading:

When the page loads, it fetches all users from the Prisma database
Shows a spinning loader while waiting for data
Blocking/Unblocking Process:

When you click a toggle switch:
The switch shows a loading state (becomes semi-transparent)
The code immediately updates the UI (optimistic update)
In the background, it calls toggleUserBlocked() to update the database
This changes the user's blocked field from 0 to 1 (or vice versa)
The page refreshes to show the most current data
Error Handling:

If something goes wrong, an error message appears at the top
The error automatically disappears after 3 seconds
Importance of User Blocking
The blocking feature is crucial for managing problematic users:

Security: You can quickly disable access for suspicious accounts
Moderation: Control who can use the platform
Visual Clarity: The red/gray toggle makes it immediately clear who is blocked
Immediate Effect: Changes take effect right away in both the UI and database
Database Integration: The blocked status (0 or 1) is stored in the Prisma database
The system is designed to be quick and intuitive - one click toggles a user's access to the platform, with clear visual feedback about their current status.

## 🧾 Stripe Hosted Checkout Integration Setup

You saw the error `Stripe not configured` after clicking "Pay Securely". That means the server couldn't create a Stripe client because the secret key env vars are missing. Follow these steps end‑to‑end (test mode first):

### 1. Create / Access Your Stripe Account

1. Go to https://dashboard.stripe.com and sign in (or create an account).
2. Toggle TEST MODE (top left) – all keys & payments will be test data.

### 2. Get Your API Keys

Navigate: Dashboard → Developers → API keys.
Copy the Test Secret Key (`sk_test_...`). (Publishable key optional for hosted checkout but useful later.)

Add to your root `.env` file:
Done! The Stripe CLI is configured for New business sandbox with account id acct_1SNsscJoetFLjerO

```
STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_placeholder   # will set after step 4
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

Do NOT commit real live keys. Use a separate `.env.local` when deploying.

### 3. Restart the Dev Server

Environment vars load only on process start.

```bash
npm run dev
```

Click "Pay Securely" again – if keys exist you should be redirected to Stripe Checkout. If not, re‑verify spelling (no quotes, no spaces) and that `STRIPE_SECRET_KEY` starts with `sk_test_`.

### 4. Configure Webhook (so orders & payments finalize)

Hosted Checkout completes on Stripe; your app learns about success via webhooks.

Local development options:
Option A (recommended): Install Stripe CLI and forward events.

```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI prints a signing secret (`whsec_...`). Put that into `.env`:

```
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXX
```

Option B: Use a tunneling tool (ngrok / Cloudflare Tunnel) to expose localhost publicly, then add a webhook endpoint in the dashboard pointing to `https://<your-tunnel>/api/webhooks/stripe`.

Events to select (minimum):

- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

### 5. Apply Pending Prisma Schema Changes

We added `stripeCheckoutSessionId` to the `Payment` model.
Generate & apply migration locally:

```bash
npx prisma migrate dev --name add_stripe_checkout_session_id
```

If already applied, Prisma will report “No changes”.

### 6. Test a Payment

1. Start listening for webhooks (Stripe CLI) or ensure tunnel is active.
2. Go to the Place Order page → click Pay Securely → land on Stripe Checkout.
3. Use test card: `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP.
4. After success, watch terminal running Stripe CLI for event deliveries.
5. Verify DB tables:
   - `Payment`: status should change to `succeeded`, `paidAt` populated, `stripeCheckoutSessionId` filled.
   - `Order` & `OrderItem`: a new order row plus line items.

### 7. (Optional) Build Success Page

The success URL currently points to: `/place-order/success?session_id=...`.
Create that route and fetch the Checkout Session via Stripe API or look up the Payment by `stripeCheckoutSessionId` to show order summary.

### 8. Go Live Checklist (later)

1. Replace test keys with live keys (`sk_live_...`, `pk_live_...`).
2. Create a new live webhook endpoint and set the live `STRIPE_WEBHOOK_SECRET`.
3. Set `NEXT_PUBLIC_SERVER_URL` to your production domain.
4. Ensure tax/shipping logic matches compliance needs (rates, VAT, etc.).
5. Turn off any test‑only logging.

### 9. Common Pitfalls

| Problem               | Cause                                           | Fix                                                                |
| --------------------- | ----------------------------------------------- | ------------------------------------------------------------------ |
| Stripe not configured | Missing / misspelled `STRIPE_SECRET_KEY`        | Add to `.env`, restart dev                                         |
| Webhook not firing    | No tunnel or CLI listener                       | Run `stripe listen` or expose via ngrok                            |
| Order not created     | `checkout.session.completed` event not received | Verify webhook secret & forwarding                                 |
| Amount mismatch       | Client total rounding vs server                 | Ensure server uses authoritative cart totals before session create |
| 404 after payment     | Missing success page route                      | Implement `/place-order/success`                                   |

### 10. Recommended Improvements

- Store Stripe Checkout Session ID together with items in one write (combine create + update).
- Add indexes: `@@index([stripeCheckoutSessionId])` is implicit via unique; add `@@index([userId, createdAt])` on `Order`.
- Convert payment/order status to enums.
- Add refund handling: listen for `charge.refunded` to update `Order.isDelivered` or add a `isRefunded` flag.

### 11. Test Cards Quick Reference

| Scenario                     | Number              | Result   |
| ---------------------------- | ------------------- | -------- |
| Standard success             | 4242 4242 4242 4242 | Succeeds |
| Decline (insufficient funds) | 4000 0000 0000 9995 | Fails    |
| Expired card                 | 4000 0000 0000 0069 | Fails    |

All test cards: https://stripe.com/docs/testing

### 12. Environment Variable Summary

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
# (Future) NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 13. Debug Tips

Run `stripe logs tail` to monitor requests.
Add temporary logging in `app/api/webhooks/stripe/route.ts` for event types until stable.
Use `stripe checkout sessions retrieve <id>` to inspect a session.

You are now ready to process test payments using Stripe Hosted Checkout.
