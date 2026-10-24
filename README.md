# Pen Miswak store

Next.js 16 (App Router, Cache Components) · Prisma 6 · PostgreSQL.

## Run locally

```bash
npm install
echo 'DATABASE_URL="postgresql://USER:PASS@localhost:5432/penmiswak"' > .env
npx prisma migrate dev
SEED_ADMIN_EMAIL=you@example.com npm run seed
npm run dev
```

Sign in from the account icon with the seed admin email. Without `RESEND_API_KEY` the sign-in code is printed in the server log.

## Environment

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (Neon or Supabase in production) |
| `RESEND_API_KEY`, `MAIL_FROM` | Sends sign-in codes and receipts |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob, for product, slide, ad and review photos and videos |

## Where things live

- `src/app/(store)` storefront pages, `src/app/admin` admin panel (opens only for the admin emails in Admin team)
- `src/lib/catalog.ts` cached storefront reads; admin actions call `updateTag('catalog')`
- `src/lib/settings.ts` everything editable in admin, with defaults
- `prisma/schema.prisma` data model, including orders and store credit for checkout

## Status

Phase 1 (storefront, admin) is done. Next: checkout, orders, receipts, store credit; then payments, couriers, languages, launch.

## Payments

Cash on delivery works everywhere with no setup. Online methods appear at checkout only once their keys are in the environment (see `.env.example`):

- **Stripe**: card for the USA, worldwide and Malaysia, plus FPX online banking. Add the webhook `https://<domain>/api/pay/stripe-webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
- **PayPal**: worldwide (USD).
- **SSLCommerz**: Bangladesh bKash, Nagad, cards and internet banking. Callbacks and IPN go to `/api/pay/ssl`.
- **Touch 'n Go**: needs a Malaysian gateway account (for example Razer Merchant Services or iPay88); hidden until one is connected.

A payment is marked paid only after the gateway confirms it server side and the amount and currency match the order.

## Couriers and tracking

- **Bangladesh (Steadfast):** with `STEADFAST_*` keys set, a cash-on-delivery order is booked the moment it is placed and an online order as soon as payment clears. The cash to collect is sent with it. If booking fails, the admin order page has a "Send to Steadfast" button.
- **Everywhere else:** book with the courier (DHL, FedEx, Aramex, USPS, J&T…) and type the tracking number on the admin order page.
- `/api/cron/track` checks every open order's courier status (Steadfast directly, others through Ship24), moves it forward, emails the customer from "Picked up" onward, and adds the reward credit on delivery. Vercel Hobby runs crons once a day only, so on Hobby use a free cron service (e.g. cron-job.org) every 1–2 hours with the `Authorization: Bearer <CRON_SECRET>` header.
- Admins can override status, rider name and phone, and dates at any time.
