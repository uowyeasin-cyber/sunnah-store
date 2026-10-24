import Link from 'next/link';
import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { getSettings } from '@/lib/catalog';
import { formatAmount, isCurrency, type Currency } from '@/lib/money';
import { ADS_MANAGER, goLink, instaOn, metaOn, PLATFORMS, shareLinks } from '@/lib/social';
import { key, loadKeys } from '@/lib/keys';
import { DonutCard, fold } from '../reports/Charts';
import { deleteCampaign, publish, saveCampaign, saveStats, syncAll, syncOne } from '../socialActions';
import CopyLink from './CopyLink';

type Q = { p?: string; cur?: string; open?: string; note?: string };
const LOST = ['failed', 'refunded', 'cancelled'];
const ISO = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '');

export default async function Social({ searchParams }: PageProps<'/admin/social'>) {
  if (!(await adminOrNull())) return null;
  const q = (await searchParams) as Q;
  const cur: Currency = isCurrency(q.cur) ? q.cur : 'BDT';
  const [all, products, { rates }, meta, insta] = await Promise.all([
    db.campaign.findMany({ orderBy: { createdAt: 'desc' } }),
    db.product.findMany({ where: { active: true }, select: { slug: true, name: true, sub: true }, orderBy: { name: 'asc' } }),
    getSettings(), metaOn(), instaOn(),
  ]);
  await loadKeys();
  const yt = !!key('YOUTUBE_API_KEY');
  const orders = await db.order.findMany({ where: { campaign: { in: all.map(c => c.code) } }, select: { campaign: true, total: true, currency: true, payStatus: true } });
  const to = (n: unknown, c: string) => (Number(n) / (rates[c as Currency] || 1)) * (rates[cur] || 1);
  const m = (n: number) => formatAmount(Math.round(n * 100) / 100, cur);
  const k = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : n.toLocaleString('en-US'));

  const rows = all.map(c => {
    const os = orders.filter(o => o.campaign === c.code && !LOST.includes(o.payStatus));
    const income = os.reduce((a, o) => a + to(o.total, o.currency), 0), spend = to(c.spend, c.currency);
    return { ...c, orders: os.length, income, spendC: spend, roas: spend ? income / spend : null, conv: c.clicks ? (os.length / c.clicks) * 100 : null };
  });
  const used = [...new Set(all.map(c => c.platform))];
  const list = q.p && PLATFORMS[q.p] ? rows.filter(r => r.platform === q.p) : rows;
  const sum = (f: (r: (typeof rows)[number]) => number) => list.reduce((a, r) => a + f(r), 0);
  const tot = { views: sum(r => r.views), reach: sum(r => r.reach), shares: sum(r => r.shares), likes: sum(r => r.likes), clicks: sum(r => r.clicks), orders: sum(r => r.orders), income: sum(r => r.income), spend: sum(r => r.spendC) };
  const byPlat = (f: (r: (typeof rows)[number]) => number) => fold(used.map(p => ({ k: PLATFORMS[p].name, v: rows.filter(r => r.platform === p).reduce((a, r) => a + f(r), 0) })));
  const href = (x: Partial<Q>) => `/admin/social?${new URLSearchParams(Object.entries({ p: q.p, cur, ...x }).filter(([, v]) => v) as [string, string][])}`;
  const kpis: [string, string, string][] = [
    ['Views', k(tot.views), `${k(tot.reach)} people reached`], ['Shares', k(tot.shares), `${k(tot.likes)} likes`],
    ['Link clicks', k(tot.clicks), tot.views ? `${((tot.clicks / tot.views) * 100).toFixed(1)}% of views` : 'from tracked links'],
    ['Orders', String(tot.orders), tot.clicks ? `${((tot.orders / tot.clicks) * 100).toFixed(1)}% of clicks` : '—'],
    ['Income', m(tot.income), `${m(tot.spend)} spent on ads`],
    ['Return on ad spend', tot.spend ? `${(tot.income / tot.spend).toFixed(1)}×` : '—', tot.spend ? `${m(tot.income - tot.spend)} after ad cost` : 'add spend to see it'],
  ];

  return <div className="rep">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12, flexWrap: 'wrap' }}>
      <div><div className="kicker">Admin</div><h2 style={{ fontSize: '2rem' }}>Social media</h2>
        <p className="muted" style={{ fontSize: '.9rem', maxWidth: '44em' }}>Every post or ad gets its own short link. Clicks, orders and income are counted by the store; views, reach and shares come from Facebook, Instagram and YouTube, or you type them in.</p></div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <form action={syncAll}><button className="btn ghost sm">↻ Sync all numbers</button></form>
        <a className="btn ghost sm" href={ADS_MANAGER} target="_blank" rel="noreferrer">Meta Ads Manager ↗</a>
      </div>
    </div>
    {q.note && <p className="panel" style={{ padding: '12px 16px', margin: '14px 0 0' }}>{q.note}</p>}

    <div className="panel soc-conn">
      <span>{meta ? '✅' : '⚪'} Facebook{insta ? ' + Instagram' : ''}</span><span>{yt ? '✅' : '⚪'} YouTube</span>
      <span>✅ WhatsApp, TikTok, X, Telegram and others: share links and click tracking</span>
      {(!meta || !yt) && <Link href="/admin/connections" className="muted">Connect accounts →</Link>}
    </div>

    <form className="rep-bar" action="/admin/social">
      <div className="seg"><Link href={href({ p: '' })} className={!q.p ? 'on' : ''}>All</Link>{used.map(p => <Link key={p} href={href({ p })} className={q.p === p ? 'on' : ''}>{PLATFORMS[p].name}</Link>)}</div>
      {q.p && <input type="hidden" name="p" value={q.p} />}
      <select name="cur" defaultValue={cur} aria-label="Currency"><option>BDT</option><option>MYR</option><option>USD</option></select>
      <button className="go">Apply</button>
    </form>

    <div className="kpi-row soc-kpis">{kpis.map(([l, v, s]) => <div key={l} className="kpi"><span className="label">{l}</span><b>{v}</b><small className="muted">{s}</small></div>)}</div>
    {used.length > 0 && <div className="dgrid" style={{ marginTop: 12 }}>
      <DonutCard title="Income by platform" rows={byPlat(r => r.income)} center={m(rows.reduce((a, r) => a + r.income, 0))} sub="income" fmt={m} />
      <DonutCard title="Clicks by platform" rows={byPlat(r => r.clicks)} center={k(rows.reduce((a, r) => a + r.clicks, 0))} sub="clicks" fmt={k} />
    </div>}

    <details className="panel soc-new" open={!all.length}>
      <summary><b>＋ New post or ad</b></summary>
      <CampaignForm products={products} />
    </details>

    <div className="soc-list">
      {list.map(r => {
        const link = goLink(r.code), P = PLATFORMS[r.platform] || PLATFORMS.other;
        return <details key={r.id} id={`c-${r.id}`} className="panel soc-card" open={q.open === r.id}>
          <summary>
            <div className="soc-title"><span className={`soc-dot ${r.status}`} /><b>{r.name}</b><small className="muted">{P.name} · {r.kind === 'ad' ? 'Ad' : 'Post'} · {r.status} · since {ISO(r.startAt)}</small></div>
            <div className="soc-nums">
              <span><em>Views</em>{k(r.views)}</span><span><em>Reach</em>{k(r.reach)}</span><span><em>Shares</em>{k(r.shares)}</span>
              <span><em>Clicks</em>{k(r.clicks)}</span><span><em>Orders</em>{r.orders}</span><span><em>Income</em>{m(r.income)}</span>
              <span><em>Spent</em>{m(r.spendC)}</span><span><em>Return</em>{r.roas === null ? '—' : r.roas.toFixed(1) + '×'}</span>
            </div>
          </summary>
          <div className="soc-body">
            <div><div className="label">Tracked link: use this in the post or ad</div><CopyLink url={link} />
              <p className="muted" style={{ fontSize: '.8rem', marginTop: 6 }}>Opens {r.target}. {r.conv !== null && `${r.conv.toFixed(1)}% of clicks became orders.`}{r.syncedAt && ` Numbers synced ${r.syncedAt.toISOString().slice(0, 16).replace('T', ' ')} UTC.`}</p>
              {r.syncNote && <p className="down" style={{ fontSize: '.82rem' }}>{r.syncNote}</p>}</div>
            <div><div className="label">Share</div><div className="soc-share">{shareLinks(link, r.message).map(([n, u]) => <a key={n} className="btn ghost sm" href={u} target="_blank" rel="noreferrer">{n}</a>)}
              {P.manage && <a className="btn ghost sm" href={r.kind === 'ad' && ['facebook', 'instagram', 'messenger', 'whatsapp'].includes(r.platform) ? ADS_MANAGER : P.manage} target="_blank" rel="noreferrer">Open {r.kind === 'ad' ? 'ads' : P.name} ↗</a>}</div></div>
            <div><div className="label">Post from here</div><div className="soc-share">
              <form action={publish}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="where" value="facebook" /><button className="btn sm" disabled={!meta}>Post to Facebook Page</button></form>
              <form action={publish}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="where" value="instagram" /><button className="btn sm" disabled={!insta || !r.image}>Post to Instagram</button></form>
              <form action={syncOne}><input type="hidden" name="id" value={r.id} /><button className="btn ghost sm" disabled={!r.externalId}>↻ Sync numbers</button></form>
            </div>{!meta && <p className="muted" style={{ fontSize: '.8rem' }}>Connect Facebook in <Link href="/admin/connections">Connections</Link> to post from here.</p>}</div>

            <form action={saveStats} className="soc-stats">
              <input type="hidden" name="id" value={r.id} />
              <div className="label" style={{ gridColumn: '1/-1' }}>Numbers (type in, or sync)</div>
              {([['views', 'Views'], ['reach', 'Reach'], ['shares', 'Shares'], ['likes', 'Likes'], ['comments', 'Comments']] as const).map(([f, l]) =>
                <div key={f} className="field"><label htmlFor={`${f}-${r.id}`}>{l}</label><input id={`${f}-${r.id}`} name={f} type="number" min="0" defaultValue={r[f]} /></div>)}
              <div className="field"><label htmlFor={`spend-${r.id}`}>Spent ({r.currency})</label><input id={`spend-${r.id}`} name="spend" type="number" min="0" step="0.01" defaultValue={Number(r.spend)} /></div>
              <div className="field" style={{ gridColumn: 'span 2' }}><label htmlFor={`ext-${r.id}`}>{r.platform === 'youtube' ? 'YouTube video link' : r.kind === 'ad' ? 'Ad ID (from Ads Manager)' : 'Post ID'}</label><input id={`ext-${r.id}`} name="externalId" defaultValue={r.externalId} placeholder="Filled in when you post from here" /></div>
              <div className="field"><label htmlFor={`st-${r.id}`}>Status</label><select id={`st-${r.id}`} name="status" defaultValue={r.status}><option value="active">Active</option><option value="paused">Paused</option><option value="ended">Ended</option></select></div>
              <button className="btn sm" style={{ alignSelf: 'end' }}>Save numbers</button>
            </form>
            <details><summary className="muted" style={{ cursor: 'pointer', fontSize: '.85rem' }}>Edit post details</summary><CampaignForm products={products} c={r} /></details>
            <form action={deleteCampaign}><input type="hidden" name="id" value={r.id} /><label style={{ fontSize: '.82rem' }}><input type="checkbox" required /> Sure</label> <button className="btn ghost sm">Delete</button></form>
          </div>
        </details>;
      })}
      {!list.length && <p className="muted">No posts or ads yet. Add one above, then use its link in Facebook, YouTube, WhatsApp or anywhere.</p>}
    </div>

    <div className="panel" style={{ marginTop: 18 }}>
      <h3>Accounts you need</h3>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: '.88rem', display: 'grid', gap: 6 }}>
        <li><b>Facebook and Instagram:</b> a Facebook Page, an Instagram business account linked to it, and a Meta developer app. Paste the Page ID and Page token in <Link href="/admin/connections">Connections</Link>. Ads are made in Meta Ads Manager; paste each ad’s ID here to bring back its numbers.</li>
        <li><b>YouTube:</b> a YouTube channel, plus a free YouTube Data API key from Google Cloud. Upload in YouTube Studio, then paste the video link here.</li>
        <li><b>WhatsApp, TikTok, X, Telegram:</b> no keys needed. Share the tracked link; clicks, orders and income are counted here. Type their views in by hand.</li>
      </ul>
    </div>
  </div>;
}

type P = { slug: string; name: string; sub: string }[];
function CampaignForm({ products, c }: { products: P; c?: { id: string; name: string; platform: string; kind: string; target: string; message: string; image: string; currency: string; budget: unknown; startAt: Date; endAt: Date | null } }) {
  const id = c?.id || 'new';
  const targets = [['/', 'Home page'], ['/shop', 'Shop all'], ...products.map(p => [`/p/${p.slug}`, p.name + (p.sub ? ' · ' + p.sub : '')])];
  if (c && !targets.some(([v]) => v === c.target)) targets.push([c.target, c.target]);
  return <form action={saveCampaign} className="soc-form">
    {c && <input type="hidden" name="id" value={c.id} />}
    <div className="two"><div className="field"><label htmlFor={`n-${id}`}>Name</label><input id={`n-${id}`} name="name" required defaultValue={c?.name} placeholder="e.g. Eid offer reel" /></div>
      <div className="field"><label htmlFor={`pl-${id}`}>Platform</label><select id={`pl-${id}`} name="platform" defaultValue={c?.platform || 'facebook'}>{Object.entries(PLATFORMS).map(([v, p]) => <option key={v} value={v}>{p.name}</option>)}</select></div></div>
    <div className="two"><div className="field"><label htmlFor={`k-${id}`}>Type</label><select id={`k-${id}`} name="kind" defaultValue={c?.kind || 'post'}><option value="post">Post (free)</option><option value="ad">Ad (paid)</option></select></div>
      <div className="field"><label htmlFor={`t-${id}`}>Link opens</label><select id={`t-${id}`} name="target" defaultValue={c?.target || '/'}>{targets.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div></div>
    <div className="field"><label htmlFor={`msg-${id}`}>Post text</label><textarea id={`msg-${id}`} name="message" rows={3} defaultValue={c?.message} placeholder="Shown when you post or share from here" /></div>
    <div className="field"><label htmlFor={`img-${id}`}>Picture link (needed for Instagram)</label><input id={`img-${id}`} name="image" type="url" defaultValue={c?.image} placeholder="https://…" /></div>
    <div className="two"><div className="field"><label htmlFor={`b-${id}`}>Ad budget</label><input id={`b-${id}`} name="budget" type="number" min="0" step="0.01" defaultValue={c ? Number(c.budget) : ''} /></div>
      <div className="field"><label htmlFor={`cu-${id}`}>Currency</label><select id={`cu-${id}`} name="currency" defaultValue={c?.currency || 'BDT'}><option>BDT</option><option>MYR</option><option>USD</option></select></div></div>
    <div className="two"><div className="field"><label htmlFor={`s-${id}`}>Starts</label><input id={`s-${id}`} name="startAt" type="date" defaultValue={ISO(c?.startAt || new Date())} /></div>
      <div className="field"><label htmlFor={`e-${id}`}>Ends (optional)</label><input id={`e-${id}`} name="endAt" type="date" defaultValue={ISO(c?.endAt || null)} /></div></div>
    <button className="btn">{c ? 'Save' : 'Create and get link'}</button>
  </form>;
}
