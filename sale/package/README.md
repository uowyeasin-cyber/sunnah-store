# Storefront Pro: a complete online store with an AI admin

A ready-to-launch online shop built with Next.js, PostgreSQL and Prisma. Your client gets a
fast storefront in four languages and an admin panel that runs the whole business: orders,
stock, payments, couriers, marketing, sourcing, money and an AI co-worker. Everything the
customer sees (name, logo, colours, menu, slides, products, offers) is changed from the admin,
with no code.

**Setup takes about 40 minutes. Open [START-HERE.md](START-HERE.md) (Bangla, every link in order) or [INSTALL.md](INSTALL.md) (English).**

**12 one-click site templates** (Admin → Store & theme → Site templates): online shop, fashion, beauty, doctor & clinic, pharmacy, grocery, restaurant, gadgets, sale campaign, Islamic lifestyle, books & courses, home & decor. One click sets the colours, fonts, texts, menu, home page and sample products.

## What's inside

### Storefront
- Home page with hero slides, launch film, categories, best sellers, "picked for you", recently viewed
- Shop with filters and sort, product pages with photo/video gallery, FAQ, "bought together", reviews with photos
- 4 languages: English, Bangla, Arabic (right to left), Hindi, chosen automatically from the browser
- Prices in USD, MYR and BDT (more currencies in admin)
- Guest checkout, bag with "save for later", coupon codes, free-delivery bar, delivery dates
- Customer account: orders, returns, store credit, saved address, sign-in by email code or Google
- Order tracking page, receipts, reorder, pre-order mode, sold-out buttons
- AI shopping chatbot (free Gemini, Groq or OpenRouter key, or Claude) that tracks orders and can hand over to a human
- Privacy, terms, help, cookie note, 404, SEO sitemap, robots, product rich results, Google/Meta product feed
- Meta Pixel, Google Analytics and server-side conversion tracking

### Admin panel
- Dashboard and reports: sales by day/week/month/year, profit and loss, expenses, stock, traffic sources, CSV export
- Orders, returns, customers, reviews, products, categories, menu, homepage, languages
- Offers and coupons with 17 badge styles, loyalty points and store credit
- Payments: Stripe, PayPal, SSLCommerz (bKash, Nagad, cards) plus pay-by-hand methods (bKash, Nagad, Rocket, bank, Touch 'n Go, Zelle) and cash on delivery
- Couriers: Steadfast, Pathao, RedX (auto booking), EasyParcel (Malaysia), Shippo (USA), Ship24 tracking for 1,500+ couriers
- Money ledger, suppliers and purchase orders, global sourcing helper (50+ platforms)
- AI tools: co-worker, "today's decisions", automation with one master on/off switch, reminders and schedule
- Earn money: ad network slots (on/off, choose where), ad short links, an "Advertise with us" page
- SEO and ads, social media posts with click and sales tracking, email marketing and abandoned-bag emails
- Staff roles, admin team, activity history
- Service keys are saved encrypted in the database

## Tech
Next.js 16, React 19, Prisma 6, PostgreSQL (Neon), Vercel Blob for media, Nodemailer/Resend for mail.
Runs on Vercel's free plan to start.

## Files
- `INSTALL.md`: step-by-step setup for a new store
- `START-HERE.md`: step-by-step setup, domain and handover guide in Bangla with every link
- `.env.example`: every setting the server reads
- `src/app/[lang]`: storefront pages; `src/app/admin`: admin panel; `src/lib`: business logic
- `prisma/schema.prisma`: database; `prisma/seed.ts`: demo catalogue for a fresh store
- `LICENSE.txt`, `CHANGELOG.md`
