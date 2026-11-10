import Link from 'next/link';
import { adminOrNull } from '@/lib/auth';
import { db } from '@/lib/db';
import { API_LABEL, CHANNELS, GROUPS } from '@/lib/channels';
import { linked } from '@/lib/lazop';
import { key, loadKeys } from '@/lib/keys';
import { linkShop, syncNow, unlinkShop } from '../channelActions';

export const metadata = { title: 'Sales channels' };

// Every marketplace and shop the products can be sold on, what each needs, and what is linked.
export default async function Channels({ searchParams }: PageProps<'/admin/channels'>) {
  if (!(await adminOrNull('channels'))) return null;
  const sp = await searchParams;
  await loadKeys(true);
  const site = process.env.SITE_URL || 'https://sunnahstore.vercel.app';
  const links = Object.fromEntries(await Promise.all(CHANNELS.filter(c => c.api === 'lazop').map(async c => [c.id, await linked(c)] as const)));
  const counts = Object.fromEntries((await db.order.groupBy({ by: ['payMethod'], where: { payMethod: { startsWith: 'ch:' } }, _count: true })).map(g => [g.payMethod.slice(3), g._count]));
  const appReady = (id: string) => !!key(id.startsWith('daraz') ? 'DARAZ_APP_KEY' : 'LAZADA_APP_KEY');
  const linkedN = Object.values(links).filter(Boolean).length;
  return <>
    <div className="page-head"><div><h2>Sales channels</h2><p>Sell the same products on Daraz, Lazada, Shopee, Amazon, eBay and more. Your store stays the one place for stock, prices and orders.</p></div></div>
    {sp.note && <p className="ord-note">{String(sp.note)}</p>}

    <section className="panel" style={{ display: 'grid', gap: 8 }}>
      <h3 style={{ margin: 0 }}>How it works</h3>
      <ol className="sm" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
        <li><b>Open a seller account</b> on the marketplace (button on each card). Each country is a separate account.</li>
        <li><b>List your products there</b> with our product file (⇩ Product file): it has names, descriptions, photos, prices in that currency and the <b>SKU</b>. Keep the SKU the same.</li>
        <li><b>Daraz and Lazada:</b> make a free app on their Open Platform, put its key in <Link className="link" href="/admin/connections">Connections → Marketplaces</Link>, then press <b>Link shop</b>. From then on stock and prices go there and their orders come into Orders by themselves (Automation → Sales channels sync).</li>
        <li><b>Google, Facebook, Instagram, Pinterest:</b> paste the feed link once; they read it by themselves.</li>
      </ol>
      <p className="muted sm" style={{ margin: 0 }}>Callback URL for the Daraz / Lazada app: <code>{site}/api/channels/callback</code> · {linkedN} shop{linkedN === 1 ? '' : 's'} linked{linkedN > 0 && <> · <form action={syncNow} style={{ display: 'inline' }}><input type="hidden" name="id" value="" /><button className="btn ghost sm">↻ Sync all now</button></form></>}</p>
    </section>

    {GROUPS.map(g => <section key={g} className="panel"><h3>{g}</h3>
      <div className="src-grid">{CHANNELS.filter(c => c.group === g).map(c => { const l = links[c.id]; return <div key={c.id} className="src-card">
        <div className="src-top"><b>{c.name}</b>{l ? <span className="tag green">Linked</span> : c.api === 'lazop' ? <span className="tag">{appReady(c.id) ? 'Ready to link' : 'Needs app key'}</span> : null}</div>
        <div className="muted sm">{c.region} · prices in {c.cur}{counts[c.id] ? ` · ${counts[c.id]} orders so far` : ''}</div>
        <p className="sm" style={{ margin: 0 }}>{API_LABEL[c.api]}{c.note ? `. ${c.note}` : ''}</p>
        <div className="src-links"><a href={c.seller} target="_blank" rel="noopener noreferrer">Seller account ↗</a>{c.dev && <a href={c.dev} target="_blank" rel="noopener noreferrer">Developer / API ↗</a>}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {c.api === 'feed' ? <code className="sm" style={{ wordBreak: 'break-all' }}>{site}/api/feed?cur=USD</code> : <a className="btn ghost sm" href={`/api/channels/export?ch=${c.id}`}>⇩ Product file</a>}
          {c.api === 'lazop' && (l ? <>
            <form action={syncNow}><input type="hidden" name="id" value={c.id} /><button className="btn sm">↻ Sync now</button></form>
            <form action={unlinkShop}><input type="hidden" name="id" value={c.id} /><button className="btn ghost sm">Unlink</button></form>
          </> : <form action={linkShop}><input type="hidden" name="id" value={c.id} /><button className="btn sm orange" disabled={!appReady(c.id)}>🔗 Link shop</button></form>)}
        </div>
      </div>; })}</div>
    </section>)}
  </>;
}
