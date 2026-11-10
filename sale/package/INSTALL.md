# Install guide

You need: a GitHub account, a Vercel account (free) and an email address for the admin.
No coding is needed. Time: about 30 minutes.

## 1. Put the code on GitHub
1. Unzip the file you bought.
2. On github.com, click **New repository**, name it (for example `my-store`), keep it **Private**, and create it.
3. Click **uploading an existing file**, drag in everything inside the unzipped folder (not the folder itself), and click **Commit changes**.
   (If you use Git: `git init && git add . && git commit -m "store" && git push` to the new repo.)

## 2. Create the project on Vercel
1. On vercel.com, click **Add New → Project**, pick the repository, and click **Import**. Do not deploy yet if it asks; if it builds and fails, that is expected until step 3 is done.
2. Open the project → **Storage → Create Database → Neon (Postgres)** → free plan → **Connect**. This adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
3. **Storage → Create → Blob** → **Connect**. This adds `BLOB_READ_WRITE_TOKEN` (needed for photo and video uploads).

## 3. Add the settings
Project → **Settings → Environment Variables**. Add these (see `.env.example` for all of them):

| Name | Value |
| --- | --- |
| `SITE_URL` | The shop's address, e.g. `https://myshop.com` (use the `*.vercel.app` address until you add a domain) |
| `SEED_ADMIN_EMAILS` | The owner's email; several are allowed, comma separated |
| `CRON_SECRET` | Any long random text |
| `SECRETS_KEY` | Another long random text. Set it once and never change it |
| `GMAIL_USER` + `GMAIL_APP_PASSWORD` | So sign-in codes reach customers. App password: Google Account → Security → 2-Step Verification → App passwords |
| `MAIL_NAME` | The shop's name, shown as the email sender |
| `LICENSE_KEY` | The license key from the seller (without it the store runs as a short free demo, then locks) |

Instead of Gmail you can use Resend: `RESEND_API_KEY` and `MAIL_FROM` after verifying your domain at resend.com.

## 4. Deploy
**Deployments → Redeploy** (or push any change). The build creates the database tables, adds a demo
catalogue to an empty database, and makes the `SEED_ADMIN_EMAILS` addresses admins.

Open `https://<your-site>/admin`, type the admin email, and enter the code from your inbox.

## 5. Make it your store (all in the admin)
1. **Settings**: store name, short logo letters or a logo image, announcement bar, tagline, theme preset and colours.
2. **Products** and **Categories**: edit or delete the demo items and add your own photos, prices and stock.
3. **Homepage** and **Menu**: slides, film, sections and links.
4. **Languages**: translations for product names, menu and slides (empty boxes show English).
5. **Payments**: tick the methods you accept and write your bKash/Nagad/bank numbers for pay-by-hand.
6. **Connections**: paste keys for Stripe, PayPal, SSLCommerz, couriers, Facebook/Instagram, YouTube and AI. Each card has a sign-up link and says which keys it needs.
7. **AI tools & chatbot**: paste a free Gemini, Groq or OpenRouter key to switch on the chatbot and AI features.
8. **Team**: add staff and pick what each one may do.
9. Check **/privacy** and **/terms** and adjust them for your business.

## 6. Your own domain
Vercel project → **Settings → Domains** → add `myshop.com` and follow the DNS steps. Then change
`SITE_URL` to the new address and redeploy. If you use Resend, verify the domain there and update `MAIL_FROM`.

## 7. Payment webhooks (only for the gateways you use)
- **Stripe**: Developers → Webhooks → add `https://<domain>/api/pay/stripe-webhook` with events `checkout.session.completed` and `checkout.session.async_payment_succeeded`; paste the signing secret in Connections.
- **SSLCommerz**: success, fail, cancel and IPN URLs all go to `https://<domain>/api/pay/ssl`.
- **PayPal**: nothing extra; use **Live** mode in Connections once tested in Sandbox.

An order is marked paid only after the gateway confirms it and the amount matches.

## 8. Automatic jobs (tracking, reminders, emails)
Vercel's free plan runs the built-in job once a day. For hourly updates, make a free job at
cron-job.org that opens `https://<domain>/api/cron/due?key=<CRON_SECRET>` every hour.

## 9. Sign in with Google (optional)
Google Cloud Console → APIs & Services → Credentials → **OAuth client ID** (Web). Authorised redirect URI:
`https://<domain>/api/auth/google/callback`. Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and
`NEXT_PUBLIC_GOOGLE_ON=1`, then redeploy.

## Run on your own computer (developers)
```bash
npm install
cp .env.example .env          # fill DATABASE_URL, DATABASE_URL_UNPOOLED, SEED_ADMIN_EMAILS
npx prisma migrate deploy
npm run seed
npm run dev                   # http://localhost:3000
```
Without email settings, the sign-in code is printed in the terminal.

## Problems
| What you see | Fix |
| --- | --- |
| "License needed" page | The free demo ended. Get a license key from the seller, add it as `LICENSE_KEY`, redeploy |
| Build fails with a database error | `DATABASE_URL` or `DATABASE_URL_UNPOOLED` is missing: connect Neon in Storage, then redeploy |
| No sign-in code arrives | Check `GMAIL_USER`/`GMAIL_APP_PASSWORD` (app password, not the normal one); test with `/api/mail-test?k=<MAIL_TEST_KEY>` |
| `/admin` says not allowed | The email is not in `SEED_ADMIN_EMAILS`; add it and redeploy |
| Photo upload fails | Connect a Blob store (step 2.3) and redeploy |
| A payment method shows "Coming soon" | Its keys are not saved in Admin → Connections yet |
| "Saved key could not be decrypted" | `SECRETS_KEY` changed; set the old value back or save the keys again |

## Updating later
Replace the files in the GitHub repository with the new version and commit. Vercel redeploys and the
build applies any database changes. Your products, orders and settings stay in the database.
