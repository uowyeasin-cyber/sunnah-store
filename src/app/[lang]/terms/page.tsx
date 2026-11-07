import Link from 'next/link';
import { getDict, getSettings } from '@/lib/catalog';
import { isLang, makeT, type Lang } from '@/lib/i18n';
import { RETURN_DAYS } from '@/lib/returns';

export const metadata = { title: 'Terms of sale' };

// The rules of buying here, taken from how checkout, pre-order, returns and store credit work.
export default async function Terms({ params }: PageProps<'/[lang]/terms'>) {
  const { lang: l } = await params;
  const lang: Lang = isLang(l) ? l : 'en';
  const [s, dict] = await Promise.all([getSettings(lang), getDict(lang)]);
  const t = makeT(dict);
  return <div className="wrap view legal">
    <div className="kicker">{t('Terms')}</div><h1>{t('Terms of sale')}</h1>
    <h2>{t('Prices and currency')}</h2>
    <p>{t('Prices shown in your currency are converted at our current rate and are a guide. The amount you pay is the one shown at checkout, in the currency of the payment method.')}</p>
    <h2>{t('Orders')}</h2>
    <p>{t('Your order is confirmed when you receive the receipt email with your order number. We may cancel an order that cannot be paid or delivered, and refund anything already paid.')}</p>
    {s.preorder?.on && <><h2>{t('Pre-orders')}</h2><p>{t('Items currently sell as pre-order: {x}. Orders ship in the order they were placed.', { x: t(s.preorder.ships) })}</p></>}
    <h2>{t('Delivery')}</h2>
    <p>{t('Delivery times are estimates from the courier. Your tracking page shows the latest status.')} <Link href="/help#shipping">{t('Shipping details')}</Link></p>
    <h2>{t('Returns and refunds')}</h2>
    <p>{t('You can request a return within {n} days of delivery from your order page. Approved refunds are given as store credit.', { n: RETURN_DAYS })} <Link href="/help#returns">{t('Returns')}</Link></p>
    <h2>{t('Store credit')}</h2>
    <p>{t('Store credit is kept in your local currency, can be used at checkout when signed in with the same email, and cannot be exchanged for cash.')}</p>
    <h2>{t('Reviews')}</h2>
    <p>{t('Reviews must be honest and about the product. We may remove reviews that are fake, offensive or unrelated.')}</p>
  </div>;
}
