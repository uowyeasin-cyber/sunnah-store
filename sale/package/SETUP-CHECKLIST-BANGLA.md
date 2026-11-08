# Client er jonno setup ar handover checklist

Ei file ta apni (seller) follow korben jokhon client er jonno store setup kore diben.
Prottek step sesh hole [ ] ke [x] korun. Somoy lage prai 30–45 minute.
Details English e INSTALL.md file e ache.

---

## A. Shuru korar age client er kach theke nin
- [ ] Store er naam, logo (PNG), main color
- [ ] Admin email (jeta diye client login korbe)
- [ ] Ekta Gmail + tar App Password (login code pathanor jonno), othoba Resend account
- [ ] Domain naam (jodi thake), na thakle pore kinbe
- [ ] Payment number gulo (bKash, Nagad, bank) ar ki ki payment nibe
- [ ] Courier (Steadfast, Pathao, RedX…) account ache kina
- [ ] Product list: naam, dam, stock, chobi

## B. Account khola (client er naam e, client er email diye)
Sob account client er nijer email e khulun, jate pore client nije malik thake.
- [ ] github.com account
- [ ] vercel.com account ("Continue with GitHub" diye)

## C. Code upload (5 min)
- [ ] Zip unzip korun
- [ ] GitHub e **New repository** → naam din (jemon `my-store`) → **Private** → Create
- [ ] **uploading an existing file** e click → unzip kora folder er bhitorer sob file drag korun → **Commit changes**

## D. Vercel e project (10 min)
- [ ] Vercel → **Add New → Project** → repo ta select → **Import** (prothom build fail hole somossa nai)
- [ ] Project → **Storage → Create Database → Neon** → Free → **Connect**
      (eta nije `DATABASE_URL` ar `DATABASE_URL_UNPOOLED` bosiye dey)
- [ ] **Storage → Create → Blob** → **Connect** (chobi/video upload er jonno)

## E. Settings bosano (Settings → Environment Variables)
| Naam | Ki likhben |
| --- | --- |
| `SITE_URL` | Store er address, jemon `https://my-store.vercel.app` |
| `SEED_ADMIN_EMAILS` | Client er admin email |
| `CRON_SECRET` | Jekono lomba random lekha |
| `SECRETS_KEY` | Arekta lomba random lekha (pore kokhono bodlaben na) |
| `GMAIL_USER` | Client er Gmail |
| `GMAIL_APP_PASSWORD` | Gmail App Password (16 letter) |
| `MAIL_NAME` | Store er naam |
| `LICENSE_KEY` | Apnar Admin → App licenses theke banano key (payment er por) |

- [ ] Sob gulo bosano hoyeche
- [ ] **Deployments → Redeploy** korechi, build sobuj (Ready) hoyeche

Gmail App Password: Google Account → Security → 2-Step Verification on → App passwords → ekta banan.

## F. Admin e dhuke store sajano (`https://<site>/admin`)
- [ ] Admin email diye login, inbox e asha code diye dhuklam
- [ ] **Settings**: store naam, logo, announcement, theme color
- [ ] **Products / Categories**: demo product muche client er product, chobi, dam, stock dilam
- [ ] **Homepage / Menu**: slide, film, link thik korlam
- [ ] **Payments**: client je method nibe tick, number likhlam (COD on/off)
- [ ] **Connections**: courier / Stripe / PayPal / SSLCommerz key (jodi client er thake)
- [ ] **AI tools & chatbot**: free Gemini key bosalam (aistudio.google.com theke)
- [ ] **Team**: client er staff add (dorkar hole)
- [ ] `/privacy` ar `/terms` page client er business onujai dekhlam

## G. Domain (jodi thake)
- [ ] Vercel → **Settings → Domains** → domain add → DNS record domain er panel e bosalam
- [ ] `SITE_URL` notun domain e bodle **Redeploy**

## H. Test (handover er age obosshoi)
- [ ] Mobile ar computer e home, shop, product page khule dekhlam
- [ ] Ekta test order dilam (Cash on delivery), admin e order dekha gelo
- [ ] Customer hisebe login code email e aslo
- [ ] Order er status bodle dekhlam
- [ ] Test order delete / cancel korlam

## I. Handover (client ke bujhiye deya)
- [ ] GitHub, Vercel, Gmail, domain er login client er kache ache
- [ ] Client ke admin panel ghuriye dekhalam: order, product, report, payment
- [ ] `SECRETS_KEY` ar `CRON_SECRET` client ke nirapode dilam (likhe rakhte bollam)
- [ ] LICENSE.txt e seller naam ar support er shorto likha ache
- [ ] Support kotodin, kivabe (WhatsApp/email) client ke janalam

## Somossa hole
| Ki dekhchen | Ki korben |
| --- | --- |
| "License needed" page | Free demo shesh. Apnar admin e oi site ke "Allowed" korun, othoba key diye `LICENSE_KEY` bosiye Redeploy |
| Build fail, database error | Storage e Neon connect kora ache kina dekhun, Redeploy |
| Login code ase na | Gmail App Password thik ache kina; spam folder dekhun |
| `/admin` e dhukte dey na | Email ta `SEED_ADMIN_EMAILS` e ache kina, thakle Redeploy |
| Chobi upload hoy na | Blob connect korun, Redeploy |
| Payment "Coming soon" dekhay | Oi payment er key Admin → Connections e bosano hoyni |
