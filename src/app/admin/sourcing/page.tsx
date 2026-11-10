import Link from 'next/link';
import { adminOrNull } from '@/lib/auth';
import { db } from '@/lib/db';
import { aiReady } from '@/lib/ai';
import { cjReady, search as cjSearch, type CjHit } from '@/lib/cj';
import { getSourcing, IDEAS, PLATFORMS, searchUrl, TOP_COUNTRIES, type Idea } from '@/lib/sourcing';
import { aiSuppliers, bulkImport, importCj, clearHistory, favIdea, importIdea, refreshTrend, savePlatforms, searchSourcing, setBuyFrom } from '../sourcingActions';

export const metadata = { title: 'Global sourcing' };
const TABS: [string, string, string][] = [['search', 'Search & import', '🔎'], ['cj', 'Dropship (CJ)', '📦'], ['platforms', 'Platforms', '🌐'], ['bulk', 'Bulk import links', '⇪'], ['favs', 'Favourites', '☆'], ['history', 'History', '🕘']];
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
  const [s, ai, cats] = await Promise.all([getSourcing(), aiReady(), db.category.findMany({ orderBy: { sort: 'asc' }, select: { id: true, name: true } })]);
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
        <div className="src-box">
          <div className="sm"><b>Buy from</b> <span className="muted">(supplier countries; none picked = anywhere)</span></div>
          <div className="src-chips">{s.buyFrom.length ? s.buyFrom.map(c => <form key={c} action={setBuyFrom}><input type="hidden" name="country" value={c} /><button name="what" value="remove" className="chip on">{c} ×</button></form>) : <span className="chip on">🌐 All countries</span>}
            {s.buyFrom.length > 0 && <form action={setBuyFrom}><button name="what" value="clear" className="chip">Clear</button></form>}</div>
          <div className="src-chips">{TOP_COUNTRIES.filter(c => !s.buyFrom.includes(c)).map(c => <form key={c} action={setBuyFrom}><input type="hidden" name="country" value={c} /><button name="what" value="add" className="chip">+ {c}</button></form>)}</div>
        </div>
        <div className="src-searching sm"><span className="muted">Searching:</span> {live.map(p => <span key={p.id} className="src-p">✓ {p.name}</span>)} <Link className="link" href="/admin/sourcing?tab=platforms">Change</Link></div>
      </section>

      {!ai && <p className="ord-note">Connect a free AI in <Link className="link" href="/admin/aitools#connect">AI tools &amp; chatbot</Link> (Gemini or Groq, no card needed) so the search can suggest products, costs and prices. The platform buttons below work without AI.</p>}

      {run && <section className="panel">
        <h3>Results for “{run.q}”{run.max ? ` under $${run.max}` : ''} <span className="muted sm">· {run.items.length} products</span></h3>
        {run.note && <p className="err sm">{run.note}</p>}
        <form action={aiSuppliers} style={{ margin: '0 0 10px' }}><input type="hidden" name="name" value={run.q} /><input type="hidden" name="run" value={run.id} /><button className="btn ghost sm">🏭 Find suppliers for “{run.q}” and add them to Suppliers</button></form>
        <p className="muted sm">Costs and prices are AI estimates. Tap a platform to see live prices and suppliers before you buy. “Add to store” makes a hidden draft in Products.</p>
        {run.items.length > 0 && <div className="src-grid">{run.items.map((i, k) => card(i, k))}</div>}
        <h4 style={{ margin: '18px 0 8px' }}>Search “{run.q}” directly on each platform</h4>
        <div className="src-links wide">{live.map(p => <a key={p.id} href={searchUrl(p, run.q)} target="_blank" rel="noopener noreferrer">{p.name} <small>{p.where}</small> ↗</a>)}</div>
      </section>}

      <section className="panel">
        <div className="row2" style={{ justifyContent: 'space-between', gap: 12 }}><h3 style={{ margin: 0 }}>Selling best worldwide right now</h3>
          <form action={refreshTrend}><button className="btn ghost sm" disabled={!ai}>↻ {s.trend ? 'Update now with AI' : 'Find with AI'}</button></form></div>
        {s.trend ? <><p className="muted sm">Found by AI on {s.trend.at.slice(0, 10)}. Tap a platform to search it there, or add it to your store.</p><div className="src-grid">{s.trend.items.map((i, k) => card(i, k, k + 1))}</div></>
          : <p className="muted sm">Press the button and the AI lists the 20 product types selling best online worldwide, with cost, price and where to buy.</p>}
      </section>

      <section className="panel"><h3>More ideas</h3>
        <div className="src-ideas">{Object.entries(IDEAS).map(([g, list]) => <div key={g}><div className="label">{g}</div><div className="src-chips">{list.map(x => <form key={x} action={searchSourcing}><input type="hidden" name="q" value={x} /><button className="chip">{x}</button></form>)}</div></div>)}</div>
      </section>
    </>}

    {tab === 'cj' && await (async () => {
      const ready = await cjReady(), cq = String(sp.cq || '').slice(0, 100);
      let hits: CjHit[] = [], err = '';
      if (ready && cq) hits = await cjSearch(cq).catch(e => { err = (e as Error).message; return []; });
      return <section className="panel">
        <h3>Dropship from CJ (auto sourcing)</h3>
        <p className="muted sm">Like AutoDS or DSers on Shopify. Search CJ’s catalog and import a product as a hidden draft, already linked to CJ. When a customer pays, the order goes to CJ by itself (Automation → Dropship orders) and ships straight to the customer with no invoice or prices. Tracking comes back to the order, and cost and stock stay current.</p>
        {!ready ? <p className="ord-note">Connect CJ Dropshipping in <Link className="link" href="/admin/connections">Connections → Suppliers</Link> first. It is free: make an account on cjdropshipping.com, then My CJ → Authorization → API → Generate key.</p> : <>
          <form className="src-search" method="get"><input type="hidden" name="tab" value="cj" /><input name="cq" required defaultValue={cq} placeholder="Search CJ, e.g. miswak, attar bottle, travel perfume" /><button className="btn orange">Search CJ</button></form>
          {err && <p className="err sm">{err}</p>}
          {cq && !err && !hits.length && <p className="muted">Nothing found for “{cq}”.</p>}
          {hits.length > 0 && <div className="src-grid">{hits.map(h => <div key={h.pid} className="src-card">
            {h.image && <img src={h.image} alt="" loading="lazy" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 }} />}
            <b className="sm">{h.name}</b>
            <div className="src-money"><span>CJ cost {$(h.price)}</span><span className="muted">+ shipping</span></div>
            <form action={importCj} className="src-import"><input type="hidden" name="pid" value={h.pid} />
              <select name="category" aria-label="Category">{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <input name="markup" type="number" step="0.1" min="1" defaultValue={2.5} aria-label="Markup times cost" title="Price = cost × this" style={{ width: 70 }} />
              <button className="btn sm orange">+ Import</button></form>
          </div>)}</div>}
          <p className="muted sm">Imported products start hidden. Open one, check the photos and price, use ✨ Write with AI for the description, then turn on Show in the store.</p>
        </>}
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
