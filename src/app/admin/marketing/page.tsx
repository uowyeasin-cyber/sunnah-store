import Link from 'next/link';
import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { SEND_LIMIT } from '@/lib/newsletter';
import { sendNewsletter } from '../marketingActions';

// Newsletter list and sending, plus abandoned bags waiting for their reminder.
export default async function Marketing({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!(await adminOrNull('marketing'))) return null;
  const { note } = await searchParams;
  const [confirmed, pending, gone, campaigns, bags, reminded, recent] = await Promise.all([
    db.subscriber.count({ where: { confirmedAt: { not: null }, unsubscribed: false } }),
    db.subscriber.count({ where: { confirmedAt: null, unsubscribed: false } }),
    db.subscriber.count({ where: { unsubscribed: true } }),
    db.mailCampaign.findMany({ orderBy: { at: 'desc' }, take: 20 }),
    db.cartLead.count({ where: { remindedAt: null } }),
    db.cartLead.count({ where: { remindedAt: { not: null } } }),
    db.subscriber.findMany({ where: { confirmedAt: { not: null }, unsubscribed: false }, orderBy: { createdAt: 'desc' }, take: 30, select: { email: true, lang: true, createdAt: true } }),
  ]);
  return <>
    <div><div className="kicker">Admin</div><h2 style={{ fontSize: '2rem' }}>Email marketing</h2></div>
    {note && <p className="panel" role="status" style={{ margin: 0 }}>{note}</p>}
    <div className="panel" style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
      <div><div className="kicker">Subscribers</div><b style={{ fontSize: '1.6rem' }}>{confirmed}</b></div>
      <div><div className="kicker">Waiting to confirm</div><b style={{ fontSize: '1.6rem' }}>{pending}</b></div>
      <div><div className="kicker">Unsubscribed</div><b style={{ fontSize: '1.6rem' }}>{gone}</b></div>
      <div><div className="kicker">Bags left at checkout</div><b style={{ fontSize: '1.6rem' }}>{bags}</b> <span className="muted" style={{ fontSize: '.8rem' }}>({reminded} reminded)</span></div>
    </div>
    <p className="muted" style={{ fontSize: '.85rem', margin: 0 }}>People join from the box at the bottom of every shop page and confirm by email. Abandoned-bag reminders are switched on in <Link href="/admin/automation">Automation</Link>.</p>

    <form action={sendNewsletter} className="panel"><h3 style={{ marginTop: 0 }}>Write a newsletter</h3>
      <div className="field"><label htmlFor="subject">Subject</label><input id="subject" name="subject" required maxLength={150} /></div>
      <div className="field"><label htmlFor="body">Message (plain text; links work)</label><textarea id="body" name="body" required rows={10} maxLength={20000} placeholder={'Assalamu alaikum,\n\nOur new …\n\nhttps://sunnahstore.vercel.app/shop'} /></div>
      <p className="muted" style={{ fontSize: '.8rem' }}>An unsubscribe link is added at the end of every email. One send reaches up to {SEND_LIMIT} subscribers (Gmail sends about 500 a day).</p>
      <label style={{ fontSize: '.85rem', display: 'block', marginBottom: 10 }}><input type="checkbox" name="sure" value="yes" /> Send to all {confirmed} subscribers now</label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className="btn ghost" name="mode" value="test">Send test to me</button><button className="btn" name="mode" value="all" disabled={!confirmed}>Send to subscribers</button></div>
    </form>

    <div className="panel"><h3 style={{ marginTop: 0 }}>Sent</h3><div className="tbl-wrap"><table><tbody>
      {campaigns.map(c => <tr key={c.id}><td>{c.at.toISOString().slice(0, 16).replace('T', ' ')}</td><td><b>{c.subject}</b><div className="muted" style={{ fontSize: '.78rem' }}>by {c.by}</div></td><td className="num">{c.sent} sent{c.failed ? ` · ${c.failed} failed` : ''}</td></tr>)}
      {!campaigns.length && <tr><td className="muted">Nothing sent yet.</td></tr>}
    </tbody></table></div></div>

    <div className="panel"><h3 style={{ marginTop: 0 }}>Product feeds for Google and Facebook</h3>
      <p className="muted" style={{ fontSize: '.85rem' }}>Paste a feed link into Google Merchant Center (free Google Shopping listings and ads) or Meta Commerce Manager (Facebook and Instagram Shop) as a scheduled feed. They read prices, offers, photos and pre-order dates from here, so changes show up there by themselves. Products need a real photo to be accepted.</p>
      <div className="tbl-wrap"><table><tbody>{['USD', 'MYR', 'BDT'].map(c => <tr key={c}><td>{c}</td><td><code style={{ wordBreak: 'break-all' }}>{`${process.env.SITE_URL || 'https://sunnahstore.vercel.app'}/api/feed?cur=${c}`}</code></td></tr>)}</tbody></table></div>
      <p className="muted" style={{ fontSize: '.8rem', marginBottom: 0 }}>Google: <a href="https://merchants.google.com/" target="_blank" rel="noreferrer">merchants.google.com</a> → Products → Add products → Add from a file → Scheduled fetch. Facebook: <a href="https://business.facebook.com/commerce/" target="_blank" rel="noreferrer">business.facebook.com/commerce</a> → Catalog → Data sources → Data feed → Scheduled feed.</p>
    </div>

    <div className="panel"><h3 style={{ marginTop: 0 }}>Newest subscribers</h3><div className="tbl-wrap"><table><tbody>
      {recent.map(r => <tr key={r.email}><td>{r.email}</td><td>{r.lang}</td><td>{r.createdAt.toISOString().slice(0, 10)}</td></tr>)}
      {!recent.length && <tr><td className="muted">No subscribers yet.</td></tr>}
    </tbody></table></div></div>
  </>;
}
