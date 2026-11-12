import Link from 'next/link';
import { adminOrNull } from '@/lib/auth';
import { getCategories, getSettings } from '@/lib/catalog';
import { currentSale, SALE_LOOKS, SALE_PLACES, type SaleEvent } from '@/lib/promo';
import { addSale, copySale, deleteSale, saleSwitch, saveSale } from '../promoActions';
import { LocalInput, LocalTime, TzField } from '../LocalTime';

const row = { display: 'flex', gap: 6, alignItems: 'center' } as const;
const wrapRow = { display: 'flex', gap: 12, flexWrap: 'wrap' } as const;

// Sale campaigns like 11.11: countdown bar, home banner, product strip, pop-up, share and "join us" buttons.
export default async function Sales({ searchParams }: PageProps<'/admin/sales'>) {
  if (!(await adminOrNull('sales'))) return null;
  const sp = (await searchParams) as Record<string, string | undefined>;
  const [s, cats] = await Promise.all([getSettings(), getCategories()]);
  const list = (s.sales || []) as SaleEvent[];
  // eslint-disable-next-line react-hooks/purity -- admin page is rendered per request
  const now = Date.now(), cur = currentSale(list, now);
  const state = (e: SaleEvent) => !e.on ? ['Off', ''] : Date.parse(e.endsAt) <= now ? ['Ended', ''] : Date.parse(e.startsAt) > now ? [e.teaser ? 'Coming soon (countdown showing)' : 'Waiting to start', 'warn'] : ['Live now', 'ok'];
  return <>
    <div className="page-head"><div><h2>Sale campaigns</h2><p>Run sales like 11.11, Eid or Black Friday. A campaign shows a countdown in the places you tick, can take a percent off by itself, and has share and WhatsApp / Messenger buttons that bring people to you. Switch each one on or off at any time.</p></div>
      <form action={addSale}><button className="btn orange">+ New campaign</button></form></div>
    {sp.note && <p className="ord-note">{sp.note}</p>}
    {sp.saved && <p className="ord-note">Saved.</p>}
    <div className="stats">
      <div className="stat"><small>Showing now</small><b className={cur ? 'ok' : ''}>{cur ? cur.ev.name : 'Nothing'}</b><span>{cur ? (cur.phase === 'live' ? 'Live' : 'Countdown to start') : 'No campaign is on right now'}</span></div>
      <div className="stat"><small>Campaigns</small><b>{list.length}</b><span>{list.filter(e => e.on).length} switched on</span></div>
    </div>
    {!list.length && <div className="panel"><p className="muted" style={{ margin: 0 }}>No campaigns yet. Tap “New campaign”: it starts as an 11.11 sale you can change.</p></div>}
    {list.map(e => { const [label, cls] = state(e); const open = sp.open === e.id || sp.saved === e.id; return <div className="panel" id={`s-${e.id}`} key={e.id}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, flex: '1 1 200px' }}>{e.name}</h3>
        <span className={`sm ${cls}`}><b>{label}</b></span>
        <span className="muted sm"><LocalTime iso={e.startsAt} /> → <LocalTime iso={e.endsAt} />{e.pct ? ` · ${e.pct}% off` : ''}</span>
        <form action={saleSwitch}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="on" value={e.on ? '0' : '1'} /><button className={`btn ${e.on ? 'ghost' : ''}`}>{e.on ? 'Switch off' : 'Switch on'}</button></form>
        <form action={copySale}><input type="hidden" name="id" value={e.id} /><button className="btn ghost">Copy</button></form>
        <form action={deleteSale}><input type="hidden" name="id" value={e.id} /><button className="btn ghost">Delete</button></form>
      </div>
      <details open={open} style={{ marginTop: 12 }}><summary className="sm"><b>Edit</b></summary>
        <form action={saveSale} style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          <input type="hidden" name="id" value={e.id} /><TzField />
          <label className="sm" style={row}><input type="checkbox" name="on" defaultChecked={e.on} /> <b>On</b> (shows on the store between the start and end time)</label>
          <div className="two"><div className="field"><label>Campaign name (for you)</label><input name="name" defaultValue={e.name} required /></div>
            <div className="field"><label>Small line above the title</label><input name="kicker" defaultValue={e.kicker} placeholder="11.11 Mega Sale" /></div></div>
          <div className="field"><label>Title</label><input name="title" defaultValue={e.title} placeholder="Up to 20% off everything" /></div>
          <div className="field"><label>Text</label><textarea name="text" rows={2} defaultValue={e.text} /></div>
          <div className="two"><div className="field"><label>Starts (your time)</label><LocalInput name="startsAt" iso={e.startsAt} /></div>
            <div className="field"><label>Ends (your time)</label><LocalInput name="endsAt" iso={e.endsAt} /></div></div>
          <label className="sm" style={row}><input type="checkbox" name="teaser" defaultChecked={e.teaser} /> Before it starts, show a “Starts in” countdown (builds excitement)</label>
          <div className="two"><div className="field"><label>Percent off by itself while live (0 = none)</label><input type="number" name="pct" min="0" max="90" defaultValue={e.pct} />
              <small className="muted">Prices on the store drop on time and checkout charges the sale price. A product&apos;s own bigger offer still wins; they do not add up.</small></div>
            <div className="field"><label>Coupon code to show on the banner (optional)</label><input name="code" defaultValue={e.code} placeholder="SALE1111" /><small className="muted">Make the code in <Link href="/admin/offers">Offers &amp; coupons</Link>.</small></div></div>
          <div className="field"><label>Discount covers (none ticked = whole shop)</label><div style={wrapRow}>{cats.map(c => <label key={c.slug} className="sm" style={row}><input type="checkbox" name="cats" value={c.slug} defaultChecked={e.cats.includes(c.slug)} />{c.name}</label>)}</div></div>
          <div className="field"><label>Where it shows</label><div style={wrapRow}>{SALE_PLACES.map(([k, l]) => <label key={k} className="sm" style={row}><input type="checkbox" name="places" value={k} defaultChecked={e.places.includes(k)} />{l}</label>)}</div></div>
          <div className="two"><div className="field"><label>Button text</label><input name="cta" defaultValue={e.cta} placeholder="Shop the sale" /></div>
            <div className="field"><label>Button goes to (/shop, /c/collection, /p/product or https://…)</label><input name="link" defaultValue={e.link} /></div></div>
          <div className="two"><div className="field"><label>Colours</label><select name="look" defaultValue={e.look}>{SALE_LOOKS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
            <div className="field"><label>Picture (optional)</label>{e.image && <img src={e.image} alt="" style={{ width: 90, borderRadius: 8 }} />}<input type="file" name="imageFile" accept="image/*" /><input type="hidden" name="image" value={e.image} />{e.image && <label className="sm"><input type="checkbox" name="noImage" /> Remove picture</label>}</div></div>
          <label className="sm" style={row}><input type="checkbox" name="share" defaultChecked={e.share} /> Show share buttons (WhatsApp, Facebook, Messenger…) so shoppers spread the sale</label>
          <div className="field"><label>Text people share (empty = the title)</label><input name="shareText" defaultValue={e.shareText} placeholder="11.11 sale is on! 20% off at our shop" /></div>
          <div className="field"><label>“Join us” buttons: WhatsApp group or number (https://wa.me/8801…), Messenger (https://m.me/yourpage), Facebook, Telegram, Instagram, YouTube…</label>
            {[...e.join, ...Array(Math.max(2, 6 - e.join.length)).fill({ label: '', url: '' })].slice(0, 8).map((j, i) => <div className="two" key={i}><input name="joinLabel" defaultValue={j.label} placeholder={i === 0 ? 'Order on WhatsApp' : i === 1 ? 'Message us on Messenger' : 'Button text'} /><input name="joinUrl" defaultValue={j.url} placeholder={i === 0 ? 'https://wa.me/8801XXXXXXXXX' : i === 1 ? 'https://m.me/yourpage' : 'https://…'} /></div>)}
            <small className="muted">Leave a row empty to hide it.</small></div>
          <div><button className="btn orange">Save campaign</button></div>
        </form>
      </details>
    </div>; })}
    <div className="panel"><h3>Tips for a big sale day</h3><ul className="muted sm" style={{ margin: 0, paddingLeft: 18 }}>
      <li>Switch the campaign on a week early with the countdown, and make tracked links in <Link href="/admin/social">Social media</Link> so you can see which post sold.</li>
      <li>Pair it with <Link href="/admin/share">Share &amp; earn</Link>: shoppers who share get credit when friends buy.</li>
      <li>Keep the percent below your profit margin. Check <Link href="/admin/reports">Profit &amp; loss</Link> after the sale.</li>
    </ul></div>
  </>;
}
