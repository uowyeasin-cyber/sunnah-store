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
