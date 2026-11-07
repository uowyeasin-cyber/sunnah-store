import Link from 'next/link';
import { getDict, getSettings } from '@/lib/catalog';
import { isLang, makeT, type Lang } from '@/lib/i18n';

export const metadata = { title: 'Privacy' };

// What the shop stores and why, matching what the code actually does.
export default async function Privacy({ params }: PageProps<'/[lang]/privacy'>) {
  const { lang: l } = await params;
  const lang: Lang = isLang(l) ? l : 'en';
  const [s, dict] = await Promise.all([getSettings(lang), getDict(lang)]);
  const t = makeT(dict), name = s.store.name;
  return <div className="wrap view legal">
    <div className="kicker">{t('Privacy')}</div><h1>{t('Your data at {x}', { x: name })}</h1>
    <p className="lead">{t('We keep only what we need to sell to you, deliver your order and look after you afterwards. We never sell your data.')}</p>
    <h2>{t('What we collect')}</h2>
    <ul>
      <li>{t('Order details: your name, email, phone, delivery address and what you bought.')}</li>
      <li>{t('Payment: a payment reference or transaction ID. Card details are handled by the payment provider and never reach us.')}</li>
      <li>{t('Account: your email, so we can send you a sign-in code. There is no password.')}</li>
      <li>{t('Reviews you post, with any photos or videos you add.')}</li>
      <li>{t('Newsletter: your email, only after you confirm it from the link we send.')}</li>
    </ul>
    <h2>{t('Cookies and device storage')}</h2>
    <p>{t('We use a small number of cookies and browser storage that the shop needs to work. There are no advertising trackers.')}</p>
    <ul>
      <li>{t('Sign-in cookie, so you stay signed in.')}</li>
      <li>{t('Language and country, to show the right language and delivery options.')}</li>
      <li>{t('Where you came from (for example a social post), for 30 days, so we know which posts bring orders.')}</li>
      <li>{t('Your bag, wishlist, currency and recently viewed products, kept on your own device.')}</li>
    </ul>
    <h2>{t('Who helps us')}</h2>
    <p>{t('Our website host, database, email service, payment providers and couriers receive only what each needs to do its job, such as your address for the courier.')}</p>
    <h2>{t('Your choices')}</h2>
    <ul>
      <li>{t('Unsubscribe from emails with the link in any newsletter.')}</li>
      <li>{t('See your orders, returns and store credit in your account.')} <Link href="/account">{t('My account')}</Link></li>
      <li>{t('Ask us to correct or delete your data by replying to any email from us.')}</li>
    </ul>
    <p className="muted">{t('Questions about this page are welcome.')} <Link href="/help#contact">{t('Contact')}</Link></p>
  </div>;
}
