import { adminOrNull } from '@/lib/auth';
import { db } from '@/lib/db';
import { AD_TYPES, NET_PLACES, PROVIDERS, readEarn, type NetUnit } from '@/lib/earn';
import { saveAdvertise, saveLinks, saveNetwork, saveShortLink, saveUnit } from './actions';

const site = () => process.env.SITE_URL || 'https://sunnahstore.vercel.app';

function UnitForm({ u }: { u: NetUnit | null }) {
  return (
    <form className="panel" action={saveUnit}>
      <input type="hidden" name="id" value={u?.id || ''} />
      <h3>{u ? u.name : 'Add an ad unit'}</h3>
      <label className="toggle"><span>This unit is on</span><input type="checkbox" name="on" defaultChecked={u?.on ?? true} /></label>
      <div className="two"><div className="field"><label>Name (for you)</label><input name="name" defaultValue={u?.name} placeholder="Homepage banner" /></div>
        <div className="field"><label>Network</label><select name="provider" defaultValue={u?.provider || 'adsense'}>{PROVIDERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div></div>
      <div className="two"><div className="field"><label>Kind of ad</label><select name="type" defaultValue={u?.type || 'banner'}>{AD_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <div className="field"><label>Where it shows</label><select name="place" defaultValue={u?.place || 'home-mid'}>{NET_PLACES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div></div>
      <div className="field"><label>AdSense ad slot ID (numbers only, AdSense only)</label><input name="slot" defaultValue={u?.slot} placeholder="1234567890" /></div>
      <div className="field"><label>Or paste the ad code from any network</label><textarea name="code" rows={4} defaultValue={u?.code} placeholder={'<script src="https://…"></script>'} style={{ fontFamily: 'monospace', fontSize: '.8rem' }} /></div>
      <div className="row2"><button className="btn">{u ? 'Save unit' : 'Add unit'}</button>{u && <button className="btn ghost sm" name="delete" value="1">Delete</button>}</div>
    </form>
  );
}

export default async function Earn() {
  if (!(await adminOrNull('earn'))) return null;
  const [e, links] = await Promise.all([readEarn(), db.shortLink.findMany({ orderBy: { createdAt: 'desc' }, take: 200 })]);
  const n = e.net, a = e.advertise;
  return <>
    <div><h2 style={{ fontSize: '2rem' }}>Earn money</h2>
      <p className="muted" style={{ marginTop: 8 }}>Extra income besides sales: ads from Google AdSense and other networks, short links that show an ad before opening, and selling ad space to other businesses. Each part has its own on/off switch. Checkout, bag and account pages never show network ads.</p></div>

    <form className="panel" action={saveNetwork}>
      <h3>1. Ad networks (AdSense, Adsterra, Monetag…)</h3>
      <label className="toggle"><span>Show network ads on the shop</span><input type="checkbox" name="on" defaultChecked={n.on} /></label>
      <div className="two"><div className="field"><label>AdSense publisher ID</label><input name="client" defaultValue={n.client} placeholder="ca-pub-1234567890123456" /></div>
        <label className="toggle" style={{ alignSelf: 'end' }}><span>AdSense Auto ads (Google places ads itself)</span><input type="checkbox" name="autoAds" defaultChecked={n.autoAds} /></label></div>
      <div className="field"><label>Kinds of ads allowed (untick to block a kind everywhere)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px' }}>{AD_TYPES.map(([v, l]) => <label key={v} style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" name="types" value={v} defaultChecked={n.types.includes(v)} /> {l}</label>)}</div></div>
      <div className="field"><label>Never show network ads on these pages</label><input name="hideFor" defaultValue={n.hideFor.join(' ')} /></div>
      <div className="field"><label>Extra ads.txt lines (other networks give you these)</label><textarea name="adsTxt" rows={3} defaultValue={n.adsTxt} style={{ fontFamily: 'monospace', fontSize: '.8rem' }} /></div>
      <p className="muted" style={{ fontSize: '.85rem' }}>Your ads.txt: <a href="/ads.txt" target="_blank">{site()}/ads.txt</a>. Sign up: {PROVIDERS.filter(p => p[2]).map(([k, l, u], i) => <span key={k}>{i ? ' · ' : ''}<a href={u} target="_blank" rel="noopener">{l}</a></span>)}. AdSense needs a site with your own domain and some content; it reviews the site first (a few days to weeks).</p>
      <div><button className="btn">Save ad network settings</button></div>
    </form>

    {n.units.map(u => <UnitForm key={u.id} u={u} />)}
    <UnitForm u={null} />

    <form className="panel" action={saveLinks}>
      <h3>2. Short links with an ad</h3>
      <p className="muted" style={{ fontSize: '.88rem' }}>Make a short link to any page or website. Visitors see a wait page with your ads and a countdown, then a button to the real link. Use network units placed on &ldquo;Short link wait page&rdquo;. Tip: AdSense does not allow forced-wait pages, so use Adsterra or Monetag there.</p>
      <label className="toggle"><span>Show the ad and countdown (off = the link opens after one tap, no ads)</span><input type="checkbox" name="on" defaultChecked={e.links.on} /></label>
      <div className="two"><div className="field"><label>Wait seconds</label><input type="number" name="wait" min={0} max={60} defaultValue={e.links.wait} /></div>
        <label className="toggle" style={{ alignSelf: 'end' }}><span>Also show one of your own banner ads</span><input type="checkbox" name="houseAd" defaultChecked={e.links.houseAd} /></label></div>
      <div className="field"><label>Message on the wait page</label><input name="note" defaultValue={e.links.note} /></div>
      <div><button className="btn">Save short link settings</button></div>
    </form>

    <form className="panel" action={saveShortLink}>
      <h3>New short link</h3>
      <div className="two"><div className="field"><label>Link to open</label><input name="target" required placeholder="https://… or /p/product-name" /></div>
        <div className="field"><label>Short name (optional)</label><input name="code" placeholder="eid-offer" /></div></div>
      <div className="two"><div className="field"><label>Title on the wait page</label><input name="title" /></div>
        <div className="field"><label>Wait seconds (-1 = default)</label><input type="number" name="wait" min={-1} max={60} defaultValue={-1} /></div></div>
      <input type="hidden" name="on" value="1" />
      <div><button className="btn">Make short link</button></div>
    </form>

    {links.length > 0 && <div className="panel"><h3>Your short links</h3>
      {links.map(l => (
        <form key={l.id} action={saveShortLink} style={{ borderTop: '1px solid var(--line, #eee)', paddingTop: 12, marginTop: 12, display: 'grid', gap: 8 }}>
          <input type="hidden" name="id" value={l.id} />
          <div className="row2" style={{ flexWrap: 'wrap' }}><a href={`/s/${l.code}`} target="_blank"><b>{site()}/s/{l.code}</b></a><span className="muted" style={{ fontSize: '.82rem' }}>{l.views} saw the ad · {l.clicks} opened</span></div>
          <div className="two"><div className="field"><label>Link to open</label><input name="target" defaultValue={l.target} /></div><div className="field"><label>Short name</label><input name="code" defaultValue={l.code} /></div></div>
          <div className="two"><div className="field"><label>Title</label><input name="title" defaultValue={l.title} /></div><div className="field"><label>Wait seconds (-1 = default)</label><input type="number" name="wait" min={-1} max={60} defaultValue={l.wait} /></div></div>
          <div className="row2"><label className="toggle"><span>On</span><input type="checkbox" name="on" defaultChecked={l.on} /></label><button className="btn sm">Save</button><button className="btn ghost sm" name="delete" value="1">Delete</button></div>
        </form>))}
    </div>}

    <form className="panel" action={saveAdvertise}>
      <h3>3. Sell ad space to other businesses</h3>
      <p className="muted" style={{ fontSize: '.88rem' }}>A public page, <a href="/advertise" target="_blank">{site()}/advertise</a>, with your prices and a WhatsApp button. When a business pays, add their banner in Marketing → Advertisements with their website as the link and start and end dates.</p>
      <label className="toggle"><span>&ldquo;Advertise with us&rdquo; page is on</span><input type="checkbox" name="on" defaultChecked={a.on} /></label>
      <div className="field"><label>Heading</label><input name="title" defaultValue={a.title} /></div>
      <div className="field"><label>Text</label><textarea name="text" rows={3} defaultValue={a.text} /></div>
      <div className="field"><label>Prices, one per line: what | price</label><textarea name="prices" rows={5} defaultValue={a.prices} /></div>
      <div className="two"><div className="field"><label>WhatsApp number (with country code)</label><input name="whatsapp" defaultValue={a.whatsapp} placeholder="8801XXXXXXXXX" /></div><div className="field"><label>Email</label><input name="email" type="email" defaultValue={a.email} /></div></div>
      <div><button className="btn">Save</button></div>
    </form>
  </>;
}
