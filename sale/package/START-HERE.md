# শুরু এখান থেকে: নিজের অনলাইন স্টোর চালু করুন (ধাপে ধাপে)

এই ফাইলটা উপর থেকে নিচে পড়ুন আর প্রতিটা লিংক ক্রমানুসারে খুলুন। কোনো কোডিং লাগবে না।
প্রথমবার সময় লাগে প্রায় ৪০–৬০ মিনিট। প্রতিটা ধাপ শেষ হলে `[ ]` কে `[x]` করুন।
(English guide: [INSTALL.md](INSTALL.md))

> **একটা কথা:** সব অ্যাকাউন্ট দোকানের মালিকের নিজের ইমেইল দিয়ে খুলুন। তাহলে দোকানটা পুরোপুরি মালিকের নিজের থাকবে।

---

## ০. খরচ কত?

| জিনিস | খরচ | কাজ |
| --- | --- | --- |
| GitHub | ফ্রি | কোড রাখার জায়গা |
| Vercel | শুরুতে ফ্রি (Hobby) | ওয়েবসাইট চালায়, ফ্রি ঠিকানা দেয়: `আপনার-নাম.vercel.app` |
| Neon ডাটাবেস | ফ্রি (০.৫ GB) | অর্ডার, প্রোডাক্ট, কাস্টমার রাখে |
| Vercel Blob | ফ্রি সীমা পর্যন্ত | ছবি ও ভিডিও রাখে |
| নিজের ডোমেইন (.com) | বছরে প্রায় ১০–১৫ ডলার | ঐচ্ছিক, ধাপ ৯ |
| লাইসেন্স | বিক্রেতার প্ল্যান অনুযায়ী (মাসিক / বাৎসরিক / লাইফটাইম) | ধাপ ৫ |

Vercel-এর ফ্রি Hobby প্ল্যান ব্যক্তিগত ও পরীক্ষার জন্য। আসল ব্যবসা চালু হলে Vercel-এর নিয়ম অনুযায়ী Pro প্ল্যান (মাসে ২০ ডলার) নেওয়া উচিত: https://vercel.com/pricing

---

## ১. দুটো অ্যাকাউন্ট খুলুন (৫ মিনিট)
- [ ] GitHub অ্যাকাউন্ট: https://github.com/signup
- [ ] Vercel অ্যাকাউন্ট: https://vercel.com/signup → **Continue with GitHub** চাপুন

## ২. কোড GitHub-এ তুলুন (৫ মিনিট)
- [ ] কেনা zip ফাইলটা আনজিপ করুন
- [ ] নতুন রিপোজিটরি খুলুন: https://github.com/new → নাম দিন (যেমন `my-store`) → **Private** → **Create repository**
- [ ] পরের পাতায় **uploading an existing file** লিংকে চাপুন → আনজিপ করা ফোল্ডারের **ভেতরের সব ফাইল** টেনে আনুন (ফোল্ডারটা নয়) → **Commit changes**

## ৩. Vercel-এ ওয়েবসাইট বানান (১০ মিনিট)
- [ ] খুলুন: https://vercel.com/new → আপনার `my-store` রিপোজিটরির পাশে **Import** → **Deploy**
      (প্রথম বিল্ড ফেইল করলে চিন্তা নেই, ডাটাবেস এখনো যোগ হয়নি)
- [ ] প্রজেক্ট খুলে **Storage** ট্যাব → **Create Database** → **Neon** → Free → **Connect**
      (এটা নিজেই `DATABASE_URL` আর `DATABASE_URL_UNPOOLED` বসিয়ে দেয়)
- [ ] আবার **Storage** → **Create** → **Blob** → **Connect** (ছবি/ভিডিও আপলোডের জন্য)

## ৪. সেটিংস বসান (১০ মিনিট)
প্রজেক্ট → **Settings** → **Environment Variables**। নিচের প্রতিটা নাম আর মান যোগ করুন:

| নাম | কী লিখবেন | কোথা থেকে পাবেন |
| --- | --- | --- |
| `SITE_URL` | `https://my-store.vercel.app` (নিজের ঠিকানা) | প্রজেক্টের **Domains** অংশে লেখা থাকে |
| `SEED_ADMIN_EMAILS` | মালিকের ইমেইল (একাধিক হলে কমা দিয়ে) | |
| `CRON_SECRET` | লম্বা এলোমেলো লেখা | https://generate-secret.vercel.app/32 খুললেই একটা পাবেন |
| `SECRETS_KEY` | আরেকটা লম্বা এলোমেলো লেখা, **পরে আর কখনো বদলাবেন না** | উপরের লিংক আবার খুলুন |
| `GMAIL_USER` | দোকানের Gmail ঠিকানা | |
| `GMAIL_APP_PASSWORD` | Gmail-এর ১৬ অক্ষরের App Password | https://myaccount.google.com/apppasswords (আগে 2-Step Verification চালু করতে হয়: https://myaccount.google.com/signinoptions/two-step-verification ) |
| `MAIL_NAME` | দোকানের নাম (ইমেইলে প্রেরকের নাম) | |
| `LICENSE_KEY` | বিক্রেতার দেওয়া লাইসেন্স কী | ধাপ ৫ |

সব নামের পূর্ণ তালিকা `.env.example` ফাইলে আছে।

- [ ] সব বসানো হয়েছে
- [ ] **Deployments** → সবচেয়ে উপরের লাইনের **⋯** → **Redeploy** → সবুজ **Ready** হওয়া পর্যন্ত অপেক্ষা

এখন আপনার দোকান লাইভ: `https://my-store.vercel.app` ✅
ফ্রি ঠিকানার নাম বদলাতে চাইলে: **Settings → Domains → Edit**, যেমন `rahim-shop.vercel.app` (খালি থাকলে পাবেন)।

## ৫. লাইসেন্স
- লাইসেন্স কী ছাড়া দোকান কিছুদিন ফ্রি ডেমো হিসেবে চলে, তারপর "License needed" পাতা দেখায়।
- বিক্রেতার কাছ থেকে মাসিক, বাৎসরিক বা লাইফটাইম প্ল্যান কিনুন। বিক্রেতা একটা কী দেবেন (যেমন `SP-XXXXXX-XXXXXX-XXXXXX`)।
- কী টা `LICENSE_KEY` নামে বসান (ধাপ ৪) → **Redeploy**।
- মাসিক/বাৎসরিক প্ল্যানের মেয়াদ শেষ হলে কয়েকদিন পর দোকান বন্ধ হয়ে যায়। বিক্রেতা রিনিউ করলে আবার নিজে থেকেই চালু হয় (৫ মিনিটের মধ্যে), কিছু করতে হয় না।

## ৬. অ্যাডমিনে ঢুকুন
- [ ] খুলুন `https://<আপনার-ঠিকানা>/admin` → মালিকের ইমেইল লিখুন → ইনবক্সে আসা কোড দিন
      (কোড না এলে স্প্যাম ফোল্ডার দেখুন)

## ৭. এক ক্লিকে ব্যবসার ধরন বেছে নিন (থিম)
**Admin → Store & theme → Site templates**। ১২টা রেডি টেমপ্লেট আছে:

| টেমপ্লেট | কার জন্য |
| --- | --- |
| 🛒 General online shop | যেকোনো সাধারণ দোকান |
| 👗 Fashion & clothing | কাপড়, জুতা, বুটিক, হিজাব-আবায়া |
| 💄 Beauty & cosmetics | স্কিনকেয়ার, মেকআপ, পারফিউম |
| 🩺 Doctor & clinic | ডাক্তার, ডেন্টিস্ট, ক্লিনিক: অনলাইন অ্যাপয়েন্টমেন্ট ও চেকআপ প্যাকেজ |
| 💊 Pharmacy & health | ফার্মেসি, সাপ্লিমেন্ট, হেলথ ডিভাইস |
| 🥬 Grocery & fresh food | মুদি, ফল, মাছ-মাংস |
| 🍔 Restaurant & food | রেস্টুরেন্ট, হোম কিচেন, কেক |
| 📱 Gadgets & electronics | মোবাইল, এক্সেসরিজ, গ্যাজেট |
| 🔥 Sale & campaign | ১১.১১ / ফ্ল্যাশ সেল, এক প্রোডাক্টের লঞ্চ |
| 🕌 Islamic lifestyle | আতর, মিসওয়াক, জায়নামাজ, ইসলামিক বই |
| 📚 Books & courses | বইয়ের দোকান, অনলাইন কোর্স |
| 🛋️ Home, furniture & decor | ফার্নিচার, ঘর সাজানো, হস্তশিল্প |

**Use this template** চাপলে পুরো সাইটের রং, ফন্ট, লেখা, মেনু, হোম পেজ আর নমুনা ক্যাটাগরি-প্রোডাক্ট একসাথে বদলে যায়। পরে সব কিছু আলাদা করে এডিট করা যায়, আর যেকোনো সময় অন্য টেমপ্লেটে যাওয়া যায়। পুরোনো প্রোডাক্ট মুছে যায় না।

## ৮. দোকান সাজান (সব অ্যাডমিন থেকে)
- [ ] **Store & theme**: নাম, লোগো, ঘোষণা বার, রং, ফন্ট
- [ ] **Products / Categories**: নমুনা প্রোডাক্ট বদলে নিজের ছবি, দাম, স্টক
- [ ] **Home page / Menu bar**: স্লাইড, ছবি, ভিডিও, বাটন, মেনুর লিংক
- [ ] **Payments**: কোন পেমেন্ট নেবেন টিক দিন, বিকাশ/নগদ/ব্যাংক নম্বর লিখুন, ক্যাশ অন ডেলিভারি অন/অফ
- [ ] **Connections (keys)**: নিচের যেগুলো দরকার সেগুলোর কী বসান (প্রতিটা কার্ডে সাইন-আপ লিংক দেওয়া আছে)
- [ ] **AI tools & chatbot**: ফ্রি Gemini কী: https://aistudio.google.com/apikey
- [ ] **Languages**: বাংলা, আরবি, হিন্দি অনুবাদ (খালি থাকলে ইংরেজি দেখায়)
- [ ] **Admins**: স্টাফ যোগ করুন, কে কী পারবে ঠিক করুন
- [ ] `/privacy` আর `/terms` পাতা নিজের ব্যবসা অনুযায়ী দেখে নিন

দরকারি সাইন-আপ লিংক:

| কাজ | লিংক |
| --- | --- |
| কার্ড পেমেন্ট (Stripe) | https://dashboard.stripe.com/register |
| PayPal | https://developer.paypal.com/dashboard/applications |
| বিকাশ/নগদ/কার্ড একসাথে (SSLCommerz) | https://sslcommerz.com |
| Steadfast কুরিয়ার | https://steadfast.com.bd |
| Pathao কুরিয়ার | https://merchant.pathao.com |
| RedX কুরিয়ার | https://redx.com.bd |
| মালয়েশিয়া কুরিয়ার (EasyParcel) | https://easyparcel.com/my |
| আমেরিকা কুরিয়ার (Shippo) | https://goshippo.com |
| Facebook Pixel | https://business.facebook.com/events_manager |
| Google Analytics | https://analytics.google.com |

## ৯. নিজের ডোমেইন (.com) কিনে লাগান (ঐচ্ছিক, ১৫ মিনিট)
ডোমেইন না কিনলেও ফ্রি `.vercel.app` ঠিকানায় দোকান চলবে।

**কোথা থেকে কিনবেন** (যেকোনো একটা):
- Vercel থেকেই (সবচেয়ে সহজ, নিজে নিজেই যুক্ত হয়): https://vercel.com/domains
- Cloudflare (কম দাম): https://domains.cloudflare.com
- Namecheap: https://www.namecheap.com
- Porkbun: https://porkbun.com
- বাংলাদেশের `.com.bd`: https://bdia.btcl.com.bd

**যুক্ত করার নিয়ম:**
- [ ] Vercel প্রজেক্ট → **Settings → Domains** → **Add** → `myshop.com` লিখুন
- [ ] Vercel যে DNS রেকর্ড দেখায়, ডোমেইন কেনার সাইটের **DNS** পাতায় সেটা বসান। সাধারণত:
      `A` রেকর্ড, নাম `@`, মান `76.76.21.21` এবং `CNAME` রেকর্ড, নাম `www`, মান `cname.vercel-dns.com`
      (Vercel থেকে কিনলে এই ধাপ লাগে না)
- [ ] কয়েক মিনিট থেকে কয়েক ঘণ্টায় Vercel-এ সবুজ ✓ আসবে
- [ ] `SITE_URL` বদলে `https://myshop.com` দিন → **Redeploy**
- [ ] (ঐচ্ছিক) দোকানের ঠিকানা থেকে ইমেইল পাঠাতে: https://resend.com → ডোমেইন ভেরিফাই → `RESEND_API_KEY` আর `MAIL_FROM` বসান

## ১০. অন্যান্য (দরকার হলে)
- **Google দিয়ে লগইন**: https://console.cloud.google.com/apis/credentials → OAuth client ID (Web) → Redirect URI `https://<ডোমেইন>/api/auth/google/callback` → `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_GOOGLE_ON=1`
- **প্রতি ঘণ্টায় অটো কাজ** (ট্র্যাকিং, রিমাইন্ডার): https://cron-job.org → নতুন জব → `https://<ডোমেইন>/api/cron/due?key=<CRON_SECRET>` প্রতি ঘণ্টায়
- **Google সার্চে আসা**: https://search.google.com/search-console → ডোমেইন যোগ → Sitemap: `https://<ডোমেইন>/sitemap.xml`
- **Stripe webhook**: Stripe → Developers → Webhooks → `https://<ডোমেইন>/api/pay/stripe-webhook`
- **SSLCommerz**: success / fail / cancel / IPN সব URL: `https://<ডোমেইন>/api/pay/ssl`

## ১১. চালুর আগে পরীক্ষা
- [ ] মোবাইল আর কম্পিউটারে হোম, শপ, প্রোডাক্ট পাতা খুলে দেখেছি
- [ ] একটা টেস্ট অর্ডার দিয়েছি (ক্যাশ অন ডেলিভারি), অ্যাডমিনে দেখা গেছে
- [ ] কাস্টমার লগইনের কোড ইমেইলে এসেছে
- [ ] টেস্ট অর্ডার ক্যান্সেল করেছি

## ১২. কাউকে দোকান বুঝিয়ে দেওয়ার সময় (হ্যান্ডওভার)
- [ ] GitHub, Vercel, Gmail, ডোমেইনের লগইন মালিকের কাছে আছে
- [ ] `SECRETS_KEY` আর `CRON_SECRET` মালিককে নিরাপদে দিয়েছি (লিখে রাখতে বলেছি)
- [ ] অ্যাডমিন ঘুরিয়ে দেখিয়েছি: অর্ডার, প্রোডাক্ট, রিপোর্ট, পেমেন্ট
- [ ] সাপোর্ট কতদিন, কীভাবে (WhatsApp/ইমেইল) জানিয়েছি

## সমস্যা হলে
| কী দেখছেন | কী করবেন |
| --- | --- |
| "License needed" পাতা | ডেমো শেষ বা প্ল্যানের মেয়াদ শেষ। বিক্রেতার সাথে যোগাযোগ করে কী নিন/রিনিউ করুন, `LICENSE_KEY` বসিয়ে Redeploy |
| বিল্ড ফেইল, database error | Storage-এ Neon যুক্ত আছে কিনা দেখুন → Redeploy |
| লগইন কোড আসে না | `GMAIL_APP_PASSWORD` ঠিক আছে কিনা (সাধারণ পাসওয়ার্ড নয়), স্প্যাম ফোল্ডার |
| `/admin` ঢুকতে দেয় না | ইমেইলটা `SEED_ADMIN_EMAILS`-এ আছে কিনা → Redeploy |
| ছবি আপলোড হয় না | Blob যুক্ত করুন → Redeploy |
| পেমেন্টে "Coming soon" | ওই পেমেন্টের কী Admin → Connections-এ বসানো হয়নি |

## নতুন ভার্সন এলে আপডেট
বিক্রেতার কাছ থেকে নতুন zip নিন → GitHub রিপোজিটরিতে ফাইলগুলো আবার আপলোড করে **Commit** করুন।
Vercel নিজেই আবার চালু করে। আপনার প্রোডাক্ট, অর্ডার, সেটিংস ডাটাবেসে থাকে, হারায় না।
