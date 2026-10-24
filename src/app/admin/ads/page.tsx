import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import type { Ad } from '@prisma/client';
import { saveAd } from '../actions';

const PLACES = [['ticker', 'Moving strip under the menu (every page)'], ['home-top', 'Homepage, under the slideshow'], ['home-mid', 'Homepage, before the collection'], ['category', 'Top of category pages'], ['product', 'Product pages'], ['popup', 'Pop-up window (once per visit)']];
const day = (d: Date | null) => d?.toISOString().slice(0, 10) || '';

function AdForm({ ad, links }: { ad: Ad | null; links: string[][] }) {
  return (
    <form className="panel" action={saveAd}>
      <input type="hidden" name="id" value={ad?.id || ''} />
      <div className="row2"><h3 style={{ flex: 1 }}>{ad ? ad.title : 'New ad'}</h3>{ad && <span className="muted" style={{ fontSize: '.82rem' }}>{ad.views} views · {ad.clicks} clicks</span>}</div>
      <label className="toggle"><span>Ad is on</span><input type="checkbox" name="on" defaultChecked={ad?.on ?? true} /></label>
      <div className="two"><div className="field"><label>Where it shows</label><select name="place" defaultValue={ad?.place || 'home-mid'}>{PLACES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <div className="field"><label>Look</label><select name="style" defaultValue={ad?.style || 'dark'}><option value="dark">Dark</option><option value="gold">Gold</option><option value="light">Light</option></select></div></div>
      <div className="two"><div className="field"><label>Headline</label><input name="title" required defaultValue={ad?.title} /></div><div className="field"><label>Small heading</label><input name="kicker" defaultValue={ad?.kicker} /></div></div>
      <div className="field"><label>Text</label><textarea name="text" rows={2} defaultValue={ad?.text} /></div>
      <div className="two"><div className="field"><label>Button text</label><input name="cta" defaultValue={ad?.cta} /></div>
        <div className="field"><label>Opens</label><select name="link" defaultValue={ad?.link || ''}>{links.map(([v, l]) => <option key={v} value={v}>{l}</option>)}{ad?.link && !links.some(l => l[0] === ad.link) && <option value={ad.link}>{ad.link}</option>}</select></div></div>
      <div className="two"><div className="field"><label>Starts</label><input type="date" name="startsAt" defaultValue={day(ad?.startsAt || null)} /></div><div className="field"><label>Ends</label><input type="date" name="endsAt" defaultValue={day(ad?.endsAt || null)} /></div></div>
      <div className="field"><label>Photo or video</label>{(ad?.image || ad?.video) && <div className="thumbs">{ad.video ? <video src={ad.video} muted /> : <img src={ad.image} alt="" />}<label><input type="checkbox" name="clearMedia" /> Remove</label></div>}<input type="file" name="media" accept="image/*,video/*" /></div>
      <input type="hidden" name="sort" value={ad?.sort ?? 0} />
      <div className="row2"><button className="btn">{ad ? 'Save ad' : 'Create ad'}</button>{ad && <button className="btn ghost sm" name="delete" value="1">Delete</button>}</div>
    </form>
  );
}

export default async function Ads() {
  if (!(await adminOrNull())) return null;
  const [ads, cats, products] = await Promise.all([db.ad.findMany({ orderBy: [{ place: 'asc' }, { sort: 'asc' }] }), db.category.findMany({ orderBy: { sort: 'asc' } }), db.product.findMany({ orderBy: { sort: 'asc' } })]);
  const links = [['', 'No link'], ...cats.map(c => [`cat:${c.slug}`, `Category: ${c.name}`]), ...products.map(p => [p.slug, `Product: ${p.name} · ${p.sub}`])];
  return <>
    <div><div className="kicker">Admin</div><h2 style={{ fontSize: '2rem' }}>Advertisements</h2><p className="muted" style={{ marginTop: 8 }}>Banners, a moving strip and a pop-up, with photos or video and start and end dates. The pop-up delay is in Design & settings.</p></div>
    <AdForm ad={null} links={links} />
    {ads.map(a => <AdForm key={a.id} ad={a} links={links} />)}
  </>;
}
