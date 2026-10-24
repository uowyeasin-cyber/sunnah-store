import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { getSettings } from '@/lib/catalog';
import { saveSlides } from '../actions';

export default async function Homepage() {
  if (!(await adminOrNull())) return null;
  const [s, products] = await Promise.all([getSettings(), db.product.findMany({ orderBy: { sort: 'asc' } })]);
  return <>
    <div><div className="kicker">Admin</div><h2 style={{ fontSize: '2rem' }}>Homepage slides</h2></div>
    <form className="panel" action={saveSlides} style={{ gap: 24 }}>
      <p className="muted" style={{ fontSize: '.88rem' }}>Add as many slides as you like. Each can show a product, or your own photo or video. Press Save after changes.</p>
      <div className="field" style={{ maxWidth: 220 }}><label>Seconds per slide</label><input name="slideSecs" type="number" min="3" max="20" step="0.5" defaultValue={s.slideSecs} /></div>
      {s.slides.map((sl, i) => <fieldset key={sl.id} className="panel" style={{ background: 'var(--bg)' }}>
        <input type="hidden" name="id" value={sl.id} />
        <div className="row2"><h3 style={{ flex: 1 }}>Slide {String(i + 1).padStart(2, '0')}</h3>{i > 0 && <button className="btn ghost sm" name="up" value={i}>Move up</button>}<label><input type="checkbox" name={`del-${i}`} /> Delete</label></div>
        <div className="two"><div className="field"><label>Small heading</label><input name={`eyebrow-${i}`} defaultValue={sl.eyebrow} /></div>
          <div className="field"><label>Product</label><select name={`product-${i}`} defaultValue={sl.product}><option value="">None</option>{products.map(p => <option key={p.id} value={p.slug}>{p.name} · {p.sub}</option>)}</select></div></div>
        <div className="two"><div className="field"><label>Headline</label><input name={`title-${i}`} defaultValue={sl.title} /></div><div className="field"><label>Headline, italic part</label><input name={`italic-${i}`} defaultValue={sl.italic} /></div></div>
        <div className="field"><label>Text</label><textarea name={`text-${i}`} rows={2} defaultValue={sl.text} /></div>
        <div className="two"><div className="field"><label>Button text</label><input name={`cta-${i}`} defaultValue={sl.cta} /></div><div className="field"><label>Look</label><select name={`look-${i}`} defaultValue={sl.look}><option value="light">Light</option><option value="dark">Dark</option></select></div></div>
        <div className="field"><label>Photo or video {sl.image || sl.video ? '(one added)' : '(optional)'}</label><input type="file" name={`media-${i}`} accept="image/*,video/*" />{(sl.image || sl.video) && <label style={{ fontSize: '.8rem' }}><input type="checkbox" name={`clear-${i}`} /> Remove media</label>}</div>
      </fieldset>)}
      <div className="row2"><button className="btn">Save slides</button><button className="btn ghost" name="add" value="1">Add a slide</button></div>
    </form>
  </>;
}
