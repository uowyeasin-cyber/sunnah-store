import { alternates } from '@/lib/seoUrls';
import Link from 'next/link';
import { getDict, getSettings } from '@/lib/catalog';
import { isLang, makeT, type Lang } from '@/lib/i18n';
import { payMethodsFor } from '@/lib/shipping';
import { RETURN_DAYS, RETURN_REASONS } from '@/lib/returns';
import { deliveryRows } from '@/lib/deliveryRows';
import Faq from '@/components/Faq';
import ContactHelp from '@/components/ContactHelp';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return { title: 'Help, shipping and returns', alternates: alternates(isLang(lang) ? lang : 'en', '/help') };
}

// Shipping, payment, returns, store credit and contact, all read from the shop's live rules.
export default async function Help({ params }: PageProps<'/[lang]/help'>) {
  const { lang: l } = await params;
  const lang: Lang = isLang(l) ? l : 'en';
  const [s, dict] = await Promise.all([getSettings(lang), getDict(lang)]);
  const t = makeT(dict);
  const rows = deliveryRows(s);
  return <div className="wrap view help">
    <div className="kicker">{t('Help')}</div><h1>{t('How we')} <em>{t('look after you')}</em></h1>
    <nav className="help-nav" aria-label={t('Help')}>{[['shipping', 'Shipping'], ['payment', 'Payment'], ['returns', 'Returns'], ['credit', 'Store credit'], ['contact', 'Contact']].map(([id, x]) => <a key={id} href={`#${id}`}>{t(x)}</a>)}</nav>

    <section id="shipping" className="panel"><h2>{t('Shipping')}</h2>
      {s.preorder?.on && <p className="note">{t('Everything currently sells as pre-order')}: <b>{t(s.preorder.ships)}</b></p>}
      <div className="tbl-wrap"><table><thead><tr><th>{t('Destination')}</th><th>{t('Ships from')}</th><th>{t('Courier')}</th><th className="num">{t('Delivery')}</th></tr></thead><tbody>
        {rows.map(r => <tr key={r.label}><td>{t(r.label)}</td><td>{r.warehouse}</td><td>{r.courier}</td><td className="num">{r.days[0]}–{r.days[1]} {t('days')}</td></tr>)}
      </tbody></table></div>
      <p className="muted">{t('The exact cost and courier for your address are shown at checkout before you pay.')} <Link href="/track">{t('Track an order')}</Link></p>
    </section>

    <section id="payment" className="panel"><h2>{t('Payment')}</h2>
      <div className="help-pay">{rows.map(r => <div key={r.label}><div className="label">{t(r.label)}</div><ul>{payMethodsFor(r.country, s.regions).map(m => <li key={m.id}>{t(m.label)}</li>)}</ul></div>)}</div>
      <p className="muted">{t('Only methods that are switched on for your country appear at checkout.')}</p>
    </section>

    <section id="returns" className="panel"><h2>{t('Returns and refunds')}</h2>
      <p>{t('You can ask for a return within {n} days of delivery, from your order page (Request a return).', { n: RETURN_DAYS })}</p>
      <p className="muted">{t('Reasons')}: {RETURN_REASONS.map(r => t(r)).join(', ')}. {t('Approved refunds go to your store credit.')}</p>
    </section>

    <section id="credit" className="panel"><h2>{t('Store credit')}</h2>
      <p>{t(s.rewardRate > 0 ? 'Every delivered order earns store credit back, kept in your local currency.' : 'Refunds are given as store credit, kept in your local currency.')}</p>
      <p className="muted">{t('Sign in with the same email at checkout to use it.')} <Link href="/account">{t('My account')}</Link></p>
    </section>

    <Faq title={t('Questions')} items={[
      { q: t('Do I need an account to order?'), a: t('No. You can check out as a guest. Sign in with a six-digit email code (no password) to see your orders, returns and store credit.') },
      { q: t('Where is my order?'), a: <>{t('Open the link in your receipt email, or enter your order number and email on the tracking page.')} <Link href="/track">{t('Track order')}</Link></> },
      { q: t('Can I pay when it arrives?'), a: t('Cash on delivery is offered where the courier supports it. You will see it at checkout if it is available for your address.') },
    ]} />

    <section id="contact" className="panel"><h2>{t('Contact')}</h2>
      <ContactHelp />
    </section>
  </div>;
}
