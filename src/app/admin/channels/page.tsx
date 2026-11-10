import Link from 'next/link';
import { adminOrNull } from '@/lib/auth';
import { db } from '@/lib/db';
import { API_LABEL, CHANNELS, GROUPS, LINKABLE, PARTNER_GROUPS, PARTNERS, money } from '@/lib/channels';
import { linked } from '@/lib/chanToken';
import { connector } from '@/lib/connectors';
import { loadKeys } from '@/lib/keys';
import { linkShop, syncNow, unlinkShop } from '../channelActions';

export const metadata = { title: 'Sales channels' };

// Every marketplace and shop the products can be sold on, what each needs, and what is linked.
export default async function Channels({ searchParams }: PageProps<'/admin/channels'>) {
  if (!(await adminOrNull('channels'))) return null;
  const sp = await searchParams;
  await loadKeys(true);
  const site = process.env.SITE_URL || 'https://sunnahstore.vercel.app';
  const state = Object.fromEntries(await Promise.all(CHANNELS.filter(c => LINKABLE.includes(c.api)).map(async c => {
    const k = (await connector(c.api))!;
    const ready = k.ready(c), on = k.keyOnly ? ready : !!(await linked(c));
    return [c.id, { ready, on, keyOnly: !!k.keyOnly, needs: k.keysNeeded(c) }] as const;
  })));
  const counts = Object.fromEntries((await db.order.groupBy({ by: ['payMethod'], where: { payMethod: { startsWith: 'ch:' } }, _count: true })).map(g => [g.payMethod.slice(3), g._count]));
  const linkedN = Object.values(state).filter(s => s.on).length;
  return <>
    <div className="page-head"><div><h2>Sales channels</h2><p>Sell the same products on Daraz, Lazada, Shopee, TikTok Shop, Amazon, eBay, Walmart and {CHANNELS.length} shops in all. Your store stays the one place for stock, prices and orders.</p></div></div>
    {sp.note && <p className="ord-note">{String(sp.note)}</p>}

    <section className="panel" style={{ display: 'grid', gap: 8 }}>
      <h3 style={{ margin: 0 }}>How it works</h3>
      <ol className="sm" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
        <li><b>Open a seller account</b> on the marketplace (button on each card). Each country is usually a separate shop.</li>
        <li><b>List your products there</b> with our product file (⇩ Product file): names, descriptions, photos, prices in that currency and the <b>SKU</b>. Keep the SKU the same.</li>
        <li><b>Daraz, Lazada, Shopee, TikTok Shop, eBay, Amazon, Walmart:</b> make a free app on their developer site, put its keys in <Link className="link" href="/admin/connections">Connections → Marketplaces</Link> (each one says where to find them), then press <b>Link shop</b>. From then on stock and prices go there and their orders come into Orders by themselves (Automation → Sales channels sync).</li>
        <li><b>Google, Facebook, Instagram, TikTok, Pinterest, Snapchat:</b> paste the feed link once; they read it by themselves.</li>
        <li>Prices are sent where the marketplace sells in USD, MYR or BDT. In other currencies (SGD, IDR, AED…) only stock is sent; set the price there once.</li>
      </ol>
      <p className="muted sm" style={{ margin: 0 }}>Callback / redirect URL for every app: <code>{site}/api/channels/callback</code> (Shopee: just the domain) · {linkedN} shop{linkedN === 1 ? '' : 's'} linked{linkedN > 0 && <> · <form action={syncNow} style={{ display: 'inline' }}><input type="hidden" name="id" value="" /><button className="btn ghost sm">↻ Sync all now</button></form></>}</p>
    </section>

    {GROUPS.map(g => <section key={g} className="panel"><h3>{g}</h3>
      <div className="src-grid">{CHANNELS.filter(c => c.group === g).map(c => { const st = state[c.id]; return <div key={c.id} className="src-card">
        <div className="src-top"><b>{c.name}</b>{st?.on ? <span className="tag green">{st.keyOnly ? 'Connected' : 'Linked'}</span> : st ? <span className="tag">{st.ready ? 'Ready to link' : 'Needs app key'}</span> : null}</div>
        <div className="muted sm">{c.region} · sells in {money(c)}{counts[c.id] ? ` · ${counts[c.id]} orders so far` : ''}</div>
        <p className="sm" style={{ margin: 0 }}>{API_LABEL[c.api]}{c.note ? `. ${c.note}` : ''}</p>
        {st && !st.ready && <p className="muted sm" style={{ margin: 0 }}>Needs: {st.needs}.</p>}
        <div className="src-links"><a href={c.seller} target="_blank" rel="noopener noreferrer">Seller account ↗</a>{c.dev && <a href={c.dev} target="_blank" rel="noopener noreferrer">Developer / API ↗</a>}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {c.api === 'feed' ? <code className="sm" style={{ wordBreak: 'break-all' }}>{site}/api/feed?cur=USD</code> : <a className="btn ghost sm" href={`/api/channels/export?ch=${c.id}`}>⇩ Product file</a>}
          {st && (st.on ? <>
            <form action={syncNow}><input type="hidden" name="id" value={c.id} /><button className="btn sm">↻ Sync now</button></form>
            {!st.keyOnly && <form action={unlinkShop}><input type="hidden" name="id" value={c.id} /><button className="btn ghost sm">Unlink</button></form>}
          </> : !st.keyOnly && <form action={linkShop}><input type="hidden" name="id" value={c.id} /><button className="btn sm orange" disabled={!st.ready}>🔗 Link shop</button></form>)}
        </div>
      </div>; })}</div>
    </section>)}

    <section className="panel"><h3>Partners</h3>
      <p className="muted sm">Help around selling: warehouses that ship for you, couriers, getting paid from marketplaces, listing and ad help, and quality checks before you pay a supplier. Suppliers and sourcing sites are in <Link className="link" href="/admin/sourcing?tab=platforms">Sourcing → Platforms</Link>.</p>
      {PARTNER_GROUPS.map(g => <div key={g} style={{ marginTop: 12 }}><b className="sm">{g}</b>
        <div className="src-grid" style={{ marginTop: 6 }}>{PARTNERS.filter(p => p.group === g).map(p => <div key={p.name} className="src-card">
          <div className="src-top"><b>{p.name}</b></div><div className="muted sm">{p.where}</div><p className="sm" style={{ margin: 0 }}>{p.what}</p>
          <div className="src-links"><a href={p.url} target="_blank" rel="noopener noreferrer">Open ↗</a></div>
        </div>)}</div></div>)}
    </section>
  </>;
}
