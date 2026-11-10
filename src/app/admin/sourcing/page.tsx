import Link from 'next/link';
import { adminOrNull } from '@/lib/auth';
import { db } from '@/lib/db';
import { aiReady, webReady } from '@/lib/ai';
import { cjReady, search as cjSearch, type CjHit } from '@/lib/cj';
import { aeLinked, aeReady } from '@/lib/aliexpress';
import { applyRule, COUNTRIES, flag, getSourcing, IDEAS, mapsSearch, marketsFor, PRICE_MODES, PLATFORMS, searchUrl, TOP_COUNTRIES, type Idea } from '@/lib/sourcing';
import { aiSuppliers, findShops, saveAutoSourcing, bulkImport, importAe, importCj, linkAe, savePriceRule, clearHistory, favIdea, importIdea, refreshTrend, savePlatforms, searchSourcing, setBuyFrom } from '../sourcingActions';

export const metadata = { title: 'Global sourcing' };
const TABS: [string, string, string][] = [['search', 'Search & import', '🔎'], ['cj', 'Dropship (CJ)', '📦'], ['ae', 'AliExpress', '🛒'], ['platforms', 'Platforms', '🌐'], ['bulk', 'Bulk import links', '⇪'], ['favs', 'Favourites', '☆'], ['history', 'History', '🕘']];
const $ = (n: number) => '$' + n.toFixed(2);

function IdeaCard({ i, n, live, cats, fav, back, run }: { i: Idea; n?: number; live: typeof PLATFORMS; cats: { id: string; name: string }[]; fav: boolean; back: string; run?: string }) {
  const plats = i.platforms.length ? live.filter(p => i.platforms.includes(p.id)) : live.slice(0, 3);
  const margin = i.price && i.cost ? Math.round((1 - i.cost / i.price) * 100) : 0;
  const json = JSON.stringify(i);
  return <div className="src-card">
    <div className="src-top"><b>{n ? <span className="src-n">#{n}</span> : null}{i.name}</b>
      <form action={favIdea}><input type="hidden" name="idea" value={json} /><input type="hidden" name="back" value={back} />{run && <input type="hidden" name="run" value={run} />}<button className={`src-fav ${fav ? 'on' : ''}`} aria-label={fav ? 'Remove from favourites' : 'Save to favourites'}>{fav ? '★' : '☆'}</button></form></div>
    <div className="muted sm">{[i.cat, i.from && `made in ${i.from}`].filter(Boolean).join(' · ')}</div>
    {i.why && <p className="sm" style={{ margin: 0 }}>{i.why}</p>}
    {(i.cost > 0 || i.price > 0) && <div className="src-money"><span>Cost ~{$(i.cost)}</span><span>Sell {$(i.price)}</span>{margin > 0 && <span className="tag green">{margin}% margin</span>}</div>}
    <div className="src-links">{plats.map(p => <a key={p.id} href={searchUrl(p, i.name)} target="_blank" rel="noopener noreferrer">{p.name} ↗</a>)}</div>
    <form action={importIdea} className="src-import"><input type="hidden" name="idea" value={json} />
      <select name="category" aria-label="Category">{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <input name="price" type="number" step="0.01" min="0" placeholder={i.price ? String(i.price) : 'Price $'} aria-label="Selling price in USD" />
      <button className="btn sm orange">+ Add to store</button></form>
    <form action={aiSuppliers}><input type="hidden" name="name" value={i.name} /><input type="hidden" name="back" value={back} />{run && <input type="hidden" name="run" value={run} />}<button className="btn sm ghost" style={{ width: '100%' }}>🏭 Find suppliers and save them</button></form>
  </div>;
}

export default async function Sourcing({ searchParams }: PageProps<'/admin/sourcing'>) {
  if (!(await adminOrNull('sourcing'))) return null;
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === sp.tab) ? String(sp.tab) : 'search';
  const [s, ai, web, cats] = await Promise.all([getSourcing(), aiReady(), webReady(), db.category.findMany({ orderBy: { sort: 'asc' }, select: { id: true, name: true } })]);
  const live = PLATFORMS.filter(p => !s.off.includes(p.id));
  const run = sp.run ? s.runs.find(r => r.id === sp.run) : null;
  const q = run?.q || String(sp.q || '');
  const favNames = new Set(s.favs.map(f => f.name));
  const card = (i: Idea, k: number, n?: number) => <IdeaCard key={i.name + k} i={i} n={n} live={live} cats={cats} fav={favNames.has(i.name)} back={tab} run={run?.id} />;
  const counts: Record<string, number> = { platforms: live.length, favs: s.favs.length, history: s.runs.length };

  return <>
    <div className="page-head"><div><h2>Global sourcing</h2><p>Pick the supplier platforms you trust from every country, search them all at once with AI, and add the best products to your store as hidden drafts.</p></div></div>
    <nav className="src-tabs">{TABS.map(([k, l, ic]) => <Link key={k} href={`/admin/sourcing?tab=${k}`} className={k === tab ? 'on' : ''}><span aria-hidden>{ic}</span> {l}{k in counts ? ` (${k === 'platforms' ? `${counts[k]}/${PLATFORMS.length}` : counts[k]})` : ''}</Link>)}</nav>
    {sp.note && <p className="ord-note">{String(sp.note)}</p>}

    {tab === 'search' && <>
      <section className="src-hero">
        <form action={searchSourcing} className="src-search">
          <input name="q" required defaultValue={q} placeholder="What do you want to sell? e.g. attar perfume oil, silicone kitchen set" />
          <input name="max" type="number" min="0" step="0.5" placeholder="Max cost $" defaultValue={run?.max || ''} />
          <button className="btn orange">Search {live.length} platforms</button>
        </form>
        <p className="sm" style={{ margin: 0, color: '#cbd5e1' }}>Leave Max cost empty to see everything, or set it to keep a good profit.</p>
        <div className="src-two">
          {([['buyFrom', 'Buy from', 'supplier countries; none picked = anywhere'], ['sellIn', 'Sell in', 'your customers’ countries; none picked = your shop’s regions']] as const).map(([list, title, hint]) => <div key={list} className="src-box">
            <div className="sm"><b>{title}</b> <span className="muted">({hint})</span></div>
            <div className="src-chips">{s[list].length ? s[list].map(c => <form key={c} action={setBuyFrom}><input type="hidden" name="list" value={list} /><input type="hidden" name="country" value={c} /><button name="what" value="remove" className="chip on">{flag(c)} {c} ×</button></form>) : <span className="chip on">🌐 All countries</span>}
              {s[list].length > 0 && <form action={setBuyFrom}><input type="hidden" name="list" value={list} /><button name="what" value="clear" className="chip">🌐 All countries</button></form>}
              {list === 'buyFrom' && <form action={setBuyFrom}><input type="hidden" name="list" value={list} /><button name="what" value="all" className="chip">⭐ Pick all suggested</button></form>}</div>
            {list === 'buyFrom' && <><div className="muted sm">World’s top sourcing countries (tap to add)</div>
              <div className="src-chips">{TOP_COUNTRIES.filter(c => !s.buyFrom.includes(c)).map(c => <form key={c} action={setBuyFrom}><input type="hidden" name="list" value={list} /><input type="hidden" name="country" value={c} /><button name="what" value="add" className="chip">+ {flag(c)} {c}</button></form>)}</div></>}
            <form action={setBuyFrom} className="src-add"><input type="hidden" name="list" value={list} /><input type="hidden" name="what" value="add" /><input name="country" list="all-countries" placeholder="Add a country…" aria-label={`Add a country to ${title}`} /><button className="btn sm">Add</button></form>
          </div>)}
        </div>
        <datalist id="all-countries">{COUNTRIES.map(c => <option key={c.code} value={c.name} />)}</datalist>
        <div className="src-searching sm"><span className="muted">Searching:</span> {live.map(p => <span key={p.id} className="src-p">{p.id === 'cj' ? '✓ CJ Dropshipping LIVE' : `✓ ${p.name}`}</span>)} <Link className="link" href="/admin/sourcing?tab=platforms">+ Add platforms</Link></div>
      </section>

      {web ? <p className="ord-note" style={{ background: '#ecfdf5', borderColor: '#a7f3d0' }}><b>Free search is on: Google Gemini with Google Search.</b> The AI looks on the web for products, prices and suppliers before it answers. It is free within Google’s daily allowance; when that is used up the next AI answers from what it knows until it resets. Prices on the web can be out of date, so check the supplier page before you buy. <Link className="link" href="/admin/aitools#connect">Change AI</Link></p>
        : ai ? <p className="ord-note">The AI answers from what it knows. Connect free <b>Google Gemini</b> in <Link className="link" href="/admin/aitools#connect">AI tools &amp; chatbot</Link> and every search also reads Google live (real shops, phone numbers, this week’s best sellers).</p>
        : <p className="ord-note">Connect a free AI in <Link className="link" href="/admin/aitools#connect">AI tools &amp; chatbot</Link> (Google Gemini is best: it searches Google live; no card needed). The platform and Google Maps buttons below work without AI.</p>}

      {run && <section className="panel">
        <h3>Results for “{run.q}”{run.max ? ` under $${run.max}` : ''} <span className="muted sm">· {run.items.length} products{run.web ? ' · from Google Search' : ''}</span></h3>
        {run.note && <p className="err sm">{run.note}</p>}
        <form action={aiSuppliers} style={{ margin: '0 0 10px' }}><input type="hidden" name="name" value={run.q} /><input type="hidden" name="run" value={run.id} /><button className="btn ghost sm">🏭 Find suppliers with websites for “{run.q}” and add them to Suppliers</button></form>
        <p className="muted sm">Costs and prices are AI estimates. Tap a platform to see live prices and suppliers before you buy. “Add to store” makes a hidden draft in Products.</p>
        {run.items.length > 0 && <div className="src-grid">{run.items.map((i, k) => card(i, k))}</div>}
      </section>}

      {run && <section className="panel">
        <h3>Open “{run.q}” directly on each platform</h3>
        <div className="src-links wide">{live.map(p => <a key={p.id} href={searchUrl(p, run.q)} target="_blank" rel="noopener noreferrer">{flag(p.where.split(' / ')[0])} {p.name} ↗</a>)}</div>
        <p className="muted sm" style={{ marginBottom: 0 }}>Found something? Copy the product links into <Link className="link" href="/admin/sourcing?tab=bulk">Bulk import links</Link> to add them all at once.</p>
      </section>}

      {run && <section className="panel">
        <div className="row2" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><h3 style={{ margin: 0 }}>Find “{run.q}” at markets and suppliers without a website</h3>
          <form action={findShops}><input type="hidden" name="name" value={run.q} /><input type="hidden" name="run" value={run.id} /><button className="btn orange sm" disabled={!ai}>🏪 Find shops with phone and email (AI)</button></form></div>
        <p className="muted sm">Many of the best wholesalers have no website, only a shop in a market and a Google Maps listing. Each market opens Google Maps at the shops selling this there. The AI button looks up real shops{web ? ' on Google' : ''} with address, phone, WhatsApp, email and what they are best for, and saves them in <Link className="link" href="/admin/suppliers">Suppliers</Link>.</p>
        {(run.shops || []).length > 0 && <><h4 style={{ margin: '12px 0 8px' }}>Shops found ({run.shops!.length}) · saved in Suppliers</h4>
          <div className="src-grid">{run.shops!.map(sh => <div key={sh.name + sh.address} className="src-card">
            <div className="src-top"><b>{sh.name}</b><span>{flag(sh.country)}</span></div>
            <div className="muted sm">{[sh.market, sh.address, sh.city, sh.country].filter(Boolean).join(', ')}</div>
            {sh.good && <p className="sm" style={{ margin: 0 }}>Best for: {sh.good}</p>}
            <div className="src-links">{sh.phone && <a href={`tel:${sh.phone.replace(/[^\d+]/g, '')}`}>📞 {sh.phone}</a>}{sh.whatsapp && <a href={`https://wa.me/${sh.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}{sh.email && <a href={`mailto:${sh.email}`}>✉ {sh.email}</a>}<a href={sh.maps} target="_blank" rel="noopener noreferrer">📍 Google Maps ↗</a></div>
          </div>)}</div>
          <p className="muted sm">Found by AI: check each shop on Google Maps and call before you send money.</p></>}
        <h4 style={{ margin: '14px 0 8px' }}>Wholesale markets and fairs{s.buyFrom.length ? ` in ${s.buyFrom.join(', ')}` : ' worldwide'}</h4>
        <div className="src-grid">{marketsFor(run.q, s.buyFrom).slice(0, 24).map(m => <div key={m.name} className="src-card">
          <div className="src-top"><b>{m.name}</b><span>{flag(m.country)}</span></div>
          <div className="muted sm">{m.kind} · {m.city}, {m.country}</div>
          <p className="sm" style={{ margin: 0 }}>Good for: {m.good}</p>
          <div className="src-links"><a href={mapsSearch(`${run.q} wholesale near ${m.name}, ${m.city}`)} target="_blank" rel="noopener noreferrer">📍 Shops for this on Google Maps ↗</a><a href={mapsSearch(`${m.name}, ${m.city}`)} target="_blank" rel="noopener noreferrer">Market ↗</a></div>
        </div>)}</div>
        {!marketsFor(run.q, s.buyFrom).length && <p className="muted sm">No big market listed in those countries yet. <a className="link" href={mapsSearch(`${run.q} wholesale ${s.buyFrom[0] || ''}`)} target="_blank" rel="noopener noreferrer">Search Google Maps ↗</a></p>}
      </section>}

      <section className="panel">
        <div className="row2" style={{ justifyContent: 'space-between', gap: 12 }}><h3 style={{ margin: 0 }}>Selling best worldwide right now</h3>
          <form action={refreshTrend}><button className="btn ghost sm" disabled={!ai}>↻ {s.trend ? 'Update now with AI' : 'Find with AI'}</button></form></div>
        {s.trend ? <><p className="muted sm">Ranked: #1 sells the most. Found by AI{s.trend.web ? ' from Google' : ''} on {s.trend.at.slice(0, 10)}{s.auto.trend ? '; updates itself every week' : ''}. Tap one to search it on all your platforms, or open it below to add it to your store.</p>
          <div className="src-rank">{s.trend.items.map((i, k) => <form key={i.name + k} action={searchSourcing}><input type="hidden" name="q" value={i.name} /><button className="src-rank-item"><b><span className="src-n">#{k + 1}</span> {i.name}</b><small>{[i.cat, i.from && `source: ${i.from}`].filter(Boolean).join(' · ')}{i.cost > 0 ? ` · cost ~$${i.cost}, sells $${i.price}` : ''}</small></button></form>)}</div>
          <details style={{ marginTop: 12 }}><summary className="sm">Show as cards with Add to store</summary><div className="src-grid" style={{ marginTop: 10 }}>{s.trend.items.map((i, k) => card(i, k, k + 1))}</div></details></>
          : <p className="muted sm">Press the button and the AI lists the 30 products selling the most online worldwide, in order, with cost, price and where to buy.</p>}
      </section>

      <section className="panel">
        <h3 style={{ marginTop: 0 }}>🤖 AI sourcing on autopilot</h3>
        <p className="muted sm">Once a week (Automation → <Link className="link" href="/admin/automation">AI sourcing</Link>) the AI does the sourcing work by itself. Tick what it may do:</p>
        <form action={saveAutoSourcing} style={{ display: 'grid', gap: 6 }}>
          <label className="sm"><input type="checkbox" name="trend" defaultChecked={s.auto.trend} /> Update the best-sellers list above</label>
          <label className="sm"><input type="checkbox" name="suppliers" defaultChecked={s.auto.suppliers} /> Find suppliers with websites for the top 5 and save them in Suppliers</label>
          <label className="sm"><input type="checkbox" name="shops" defaultChecked={s.auto.shops} /> Find shops without a website (Google Maps, phone, email) for the top 3 and save them</label>
          <label className="sm"><input type="checkbox" name="importCj" defaultChecked={s.auto.importCj} /> Import the closest CJ product for the top 5 as hidden drafts, priced by your rule (needs CJ connected; nothing is bought)</label>
          <div><button className="btn sm orange">Save</button></div>
        </form>
        {s.auto.log.length > 0 && <><p className="sm" style={{ margin: '10px 0 4px' }}><b>Last run {s.auto.lastRun.slice(0, 10)}</b></p><ul className="sm" style={{ margin: 0, paddingLeft: 18 }}>{s.auto.log.map((l, k) => <li key={k}>{l}</li>)}</ul></>}
      </section>

      <section className="panel"><h3>More ideas</h3>
        <div className="src-ideas">{Object.entries(IDEAS).map(([g, list]) => <div key={g}><div className="label">{g}</div><div className="src-chips">{list.map(x => <form key={x} action={searchSourcing}><input type="hidden" name="q" value={x} /><button className="chip">{x}</button></form>)}</div></div>)}</div>
      </section>
    </>}

    {tab === 'cj' && await (async () => {
      const ready = await cjReady(), cq = String(sp.cq || '').slice(0, 100), page = Math.min(50, Math.max(1, Number(sp.cpage) || 1));
      let hits: CjHit[] = [], err = '';
      if (ready && cq) hits = await cjSearch(cq, page).catch(e => { err = (e as Error).message; return []; });
      const have = hits.length ? new Map((await db.product.findMany({ where: { supplierUrl: { in: hits.map(h => `cj:${h.pid}`) } }, select: { id: true, supplierUrl: true } })).map(p => [p.supplierUrl.slice(3), p.id])) : new Map<string, string>();
      const r = s.price, pageLink = (n: number) => `/admin/sourcing?tab=cj&cq=${encodeURIComponent(cq)}&cpage=${n}`;
      return <section className="panel">
        <h3>Dropship from CJ (auto sourcing)</h3>
        <p className="muted sm">Like AutoDS or DSers on Shopify. Search CJ’s catalog, tick products and import them, already linked to CJ and priced by your rule. When a customer pays, the order goes to CJ by itself (Automation → Dropship orders) and ships straight to the customer with no invoice or prices. Tracking comes back to the order, and cost, stock and price stay current.</p>
        {!ready ? <p className="ord-note">Connect CJ Dropshipping in <Link className="link" href="/admin/connections">Connections → Suppliers</Link> first. It is free: make an account on cjdropshipping.com, then My CJ → Authorization → API → Generate key.</p> : <>
          <form action={savePriceRule} className="panel" style={{ background: 'var(--cloth)', display: 'grid', gap: 10 }}>
            <b>💲 Import settings</b>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
              <div className="field" style={{ margin: 0 }}><label htmlFor="pr-mode">Price =</label><select id="pr-mode" name="mode" defaultValue={r.mode}>{PRICE_MODES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
              <div className="field" style={{ margin: 0 }}><label htmlFor="pr-val">Value</label><input id="pr-val" name="value" type="number" step="0.01" min="0" defaultValue={r.value} style={{ width: 100 }} /></div>
              <div className="field" style={{ margin: 0 }}><label htmlFor="pr-ship">Add CJ shipping to</label><select id="pr-ship" name="ship" defaultValue={r.ship}><option value="">Don’t add shipping</option>{[['US', 'USA'], ['MY', 'Malaysia'], ['BD', 'Bangladesh'], ['GB', 'UK'], ['SA', 'Saudi Arabia'], ['AE', 'UAE'], ['CA', 'Canada'], ['AU', 'Australia']].map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></div>
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <label className="sm" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" name="round" defaultChecked={r.round} /> End prices in .99</label>
              <label className="sm" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" name="ai" defaultChecked={r.ai} disabled={!ai} /> ✨ AI rewrites name and description{!ai && ' (connect an AI first)'}</label>
              <label className="sm" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" name="live" defaultChecked={r.live} /> Show in the shop at once (off: hidden drafts)</label>
              <label className="sm" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" name="reprice" defaultChecked={r.reprice} /> When CJ’s cost changes, update my price by this rule</label>
            </div>
            <input type="hidden" name="cq" value={cq} /><div><button className="btn sm">Save settings</button></div>
            <p className="muted sm" style={{ margin: 0 }}>Cost = CJ price{r.ship ? ' + cheapest CJ shipping' : ''}. For a $5 cost: ×2.5 → {$(applyRule(5, { ...r, mode: 'x', value: 2.5 }))} · 80% → {$(applyRule(5, { ...r, mode: 'pct', value: 80 }))} · +$6 → {$(applyRule(5, { ...r, mode: 'add', value: 6 }))}. You can also type your own price on any product.</p>
          </form>
          <form className="src-search" method="get"><input type="hidden" name="tab" value="cj" /><input name="cq" required defaultValue={cq} placeholder="Search CJ, e.g. miswak, attar bottle, travel perfume" /><button className="btn orange">Search CJ</button></form>
          {err && <p className="err sm">{err}</p>}
          {cq && !err && !hits.length && <p className="muted">Nothing {page > 1 ? 'more ' : ''}found for “{cq}”.</p>}
          {hits.length > 0 && <form action={importCj} style={{ display: 'grid', gap: 12 }}>
            <input type="hidden" name="cq" value={cq} /><input type="hidden" name="cpage" value={page} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', position: 'sticky', top: 0, zIndex: 2, background: 'var(--bg, #fff)', padding: '8px 0' }}>
              <select name="category" aria-label="Collection for imports">{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <button className="btn orange sm">⇩ Import ticked (up to 10)</button>
              <span className="muted sm">Page {page} · {have.size ? `${have.size} already in your store` : 'tick the ones you want'}</span>
            </div>
            <div className="src-grid">{hits.map(h => { const mine = have.get(h.pid); return <div key={h.pid} className="src-card" style={mine ? { opacity: .75 } : undefined}>
              {h.image && <img src={h.image} alt="" loading="lazy" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 }} />}
              <label className="sm" style={{ display: 'flex', gap: 6, alignItems: 'start' }}>{!mine && <input type="checkbox" name="pids" value={h.pid} />}<b>{h.name}</b></label>
              <div className="src-money"><span>CJ cost {$(h.price)}</span><span>Sells ~{$(applyRule(h.price, r))}{r.ship ? ' + ship' : ''}</span></div>
              {mine ? <Link className="btn sm ghost" href={`/admin/products/${mine}`}>✓ In your store · Open</Link>
                : <div className="src-import"><input name={`price-${h.pid}`} type="number" step="0.01" min="0" placeholder="Own $" aria-label="Your own price in USD (optional)" title="Leave empty to use the price rule" style={{ width: 80 }} />
                  <button className="btn sm orange" name="one" value={h.pid}>+ Import</button></div>}
            </div>; })}</div>
            <div className="row2" style={{ gap: 8 }}>{page > 1 && <Link className="btn ghost sm" href={pageLink(page - 1)}>← Previous</Link>}{hits.length >= 20 && <Link className="btn ghost sm" href={pageLink(page + 1)}>Next page →</Link>}</div>
          </form>}
          <p className="muted sm">Open an imported product to check photos and price. ✨ Write with AI on the product page rewrites the text any time.</p>
        </>}
      </section>;
    })()}

    {tab === 'ae' && await (async () => {
      const ready = await aeReady(), on = ready && await aeLinked(), n = await db.product.count({ where: { supplierUrl: { startsWith: 'ae:' } } });
      return <section className="panel" style={{ display: 'grid', gap: 12 }}>
        <h3 style={{ margin: 0 }}>Dropship from AliExpress (like DSers)</h3>
        <p className="muted sm" style={{ margin: 0 }}>Paste AliExpress product links. Each is imported with photos, the cheapest variant’s cost and your price rule (set on the Dropship (CJ) tab), already linked to AliExpress. When a customer pays, the order is placed on AliExpress for the customer’s address with no invoice or prices (Automation → Dropship orders), and the tracking number comes back to the order. AliExpress charges your saved card or balance; if not, pay it in AliExpress → My orders.</p>
        {!ready ? <p className="ord-note">Add the AliExpress app key and secret in <Link className="link" href="/admin/connections">Connections → Suppliers</Link> first. Free: openservice.aliexpress.com → create a Dropshipping app, callback URL <code>{(process.env.SITE_URL || 'https://sunnahstore.vercel.app') + '/api/channels/callback'}</code>.</p>
          : !on ? <form action={linkAe}><button className="btn orange">🔗 Link AliExpress</button> <span className="muted sm">Sign in with the AliExpress buyer account that pays for orders.</span></form>
          : <form action={importAe} style={{ display: 'grid', gap: 10 }}>
            <textarea name="links" rows={6} required placeholder={'https://www.aliexpress.com/item/1005004043442825.html\n(up to 10 links, one per line)'} style={{ width: '100%' }} />
            <div className="row2" style={{ gap: 8, flexWrap: 'wrap' }}>
              <select name="category" aria-label="Collection for imports">{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <input name="price" type="number" step="0.01" min="0" placeholder="Own $ (optional)" aria-label="Your own price in USD" style={{ width: 140 }} />
              <button className="btn orange">⇩ Import from AliExpress</button>
            </div>
            <p className="muted sm" style={{ margin: 0 }}>Linked ✓ · {n} AliExpress product{n === 1 ? '' : 's'} in your store.</p>
          </form>}
      </section>;
    })()}

    {tab === 'platforms' && <form action={savePlatforms} className="panel">
      <div className="row2" style={{ justifyContent: 'space-between', gap: 12 }}><h3 style={{ margin: 0 }}>Supplier platforms ({live.length}/{PLATFORMS.length} on)</h3><button className="btn orange sm">Save</button></div>
      <p className="muted sm">Ticked platforms are searched and suggested by the AI. Each button opens that platform’s own search (or a Google search of the site), so you always see live prices.</p>
      <div className="src-plats">{PLATFORMS.map(p => <label key={p.id} className="src-plat"><input type="checkbox" name="on" value={p.id} defaultChecked={!s.off.includes(p.id)} /><span><b>{p.name}</b><small>{p.where}</small></span></label>)}</div>
    </form>}

    {tab === 'bulk' && <form action={bulkImport} className="panel">
      <h3>Bulk import links</h3>
      <p className="muted sm">Paste product links from any platform, one per line (up to 30). Each becomes a hidden draft in Products with the link saved, so you can add the cost, price and photos and make it live.</p>
      <textarea name="links" rows={8} placeholder={'https://www.alibaba.com/product-detail/...\nhttps://www.aliexpress.com/item/...'} style={{ width: '100%' }} />
      <div className="row2" style={{ gap: 10, marginTop: 10 }}>
        <div className="field"><label>Category</label><select name="category">{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="field"><label>Markup (x cost)</label><input name="markup" type="number" step="0.1" min="1" defaultValue={2.5} /></div>
        <button className="btn orange" style={{ alignSelf: 'end' }}>Import as drafts</button>
      </div>
      <p className="muted sm">{s.imported} products imported so far. <Link className="link" href="/admin/products">Open Products →</Link></p>
    </form>}

    {tab === 'favs' && <section className="panel"><h3>Favourites ({s.favs.length})</h3>
      {s.favs.length ? <div className="src-grid">{s.favs.map((i, k) => card(i, k))}</div> : <p className="muted">Tap ☆ on any product idea to keep it here.</p>}</section>}

    {tab === 'history' && <section className="panel">
      <div className="row2" style={{ justifyContent: 'space-between' }}><h3 style={{ margin: 0 }}>Search history</h3>{s.runs.length > 0 && <form action={clearHistory}><button className="btn ghost sm">Clear</button></form>}</div>
      {s.runs.length ? <table><thead><tr><th>Search</th><th>Max cost</th><th>Found</th><th>When</th><th /></tr></thead><tbody>{s.runs.map(r => <tr key={r.id}><td>{r.q}</td><td>{r.max ? $(r.max) : 'any'}</td><td>{r.items.length}</td><td className="muted sm">{r.at.slice(0, 16).replace('T', ' ')}</td><td><Link className="link" href={`/admin/sourcing?tab=search&run=${r.id}`}>Open →</Link></td></tr>)}</tbody></table>
        : <p className="muted">Your searches appear here.</p>}
    </section>}
  </>;
}
