import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { getSettings } from '@/lib/catalog';
import { saveSlides } from '../actions';
import { CAT_STYLES, FITS, heroSlides, MOTIONS } from '@/lib/settings';

const SIZES: [number, string][] = [[0, 'Automatic'], [45, 'Small'], [65, 'Medium'], [82, 'Large'], [100, 'Full screen']];

// The top of the home page: one list of items. Each item is any file (photo, video, sound, PDF...)
// with its own size/fit, text and as many buttons as you like.
export default async function Homepage() {
  if (!(await adminOrNull('homepage'))) return null;
  const [s, products] = await Promise.all([getSettings(), db.product.findMany({ orderBy: { sort: 'asc' } })]);
  const slides = heroSlides(s);
  const thumb = { width: 200, height: 112, objectFit: 'cover', borderRadius: 8, background: '#000' } as const;
  return <>
    <div><h2 style={{ fontSize: '2rem' }}>Top of the home page</h2></div>
    <form className="panel" action={saveSlides} style={{ gap: 24 }}>
      <datalist id="links"><option value="/shop">Shop all</option><option value="/track">Track order</option><option value="/help">Help</option>{products.map(p => <option key={p.id} value={`/p/${p.slug}`}>{p.name}</option>)}</datalist>
      <div className="panel" style={{ background: 'var(--bg)', borderStyle: 'dashed' }}>
        <b>Add media</b>
        <input type="file" name="newMedia" multiple />
        <small className="muted">Any file: photo, video, sound, PDF or anything else. Pick several at once; each becomes its own item below, where you can write text and add buttons.</small>
      </div>
      <div className="two">
        <div className="field"><label>Height of this section</label><select name="heroHeight" defaultValue={SIZES.some(([v]) => v === s.heroHeight) ? s.heroHeight : 82}>{SIZES.map(([v, l]) => <option key={v} value={v}>{l}{v ? ` (${v}% of screen)` : ''}</option>)}</select></div>
        <div className="field"><label>Seconds per photo</label><input name="slideSecs" type="number" min="3" max="20" step="0.5" defaultValue={s.slideSecs} /><small className="muted">Videos play to the end first.</small></div>
      </div>
      <input type="hidden" name="newMotion" value="zoom" />
      {slides.map((sl, i) => {
        const btns = sl.buttons || [];
        return <fieldset key={sl.id} className="panel" style={{ background: 'var(--bg)' }}>
          <input type="hidden" name="id" value={sl.id} />
          <div className="row2"><h3 style={{ flex: 1 }}>Item {i + 1}</h3>{i > 0 && <button className="btn ghost sm" name="up" value={i}>Move up</button>}<label><input type="checkbox" name={`del-${i}`} /> Delete</label></div>
          <div className="two">
            <div className="field"><label>Media</label>
              {sl.video ? <video src={sl.video} poster={sl.poster || undefined} muted playsInline controls style={thumb} />
                : sl.image ? <img src={sl.image} alt="" style={thumb} />
                : sl.audio ? <audio src={sl.audio} controls style={{ width: 240 }} />
                : sl.file ? <a href={sl.file} target="_blank" rel="noreferrer">📄 {sl.fileName || 'File'}</a>
                : <small className="muted">{sl.product ? 'Showing the product photo' : 'None yet'}</small>}
              <input type="file" name={`media-${i}`} />
              <input name={`link-${i}`} placeholder="or paste a link to a file" defaultValue="" />
              {(sl.image || sl.video || sl.audio || sl.file) && <label style={{ fontSize: '.8rem' }}><input type="checkbox" name={`clear-${i}`} /> Remove media</label>}
            </div>
            <div className="field"><label>Size and fit</label><select name={`fit-${i}`} defaultValue={sl.fit || 'cover'}>{FITS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              <label style={{ marginTop: 10 }}>Colours</label><select name={`look-${i}`} defaultValue={sl.look}><option value="dark">Light text on dark</option><option value="light">Dark text on light</option></select></div>
          </div>
          <div className="field"><label>Headline (optional)</label><input name={`title-${i}`} defaultValue={sl.title} /></div>
          <div className="field"><label>Description (optional)</label><textarea name={`text-${i}`} rows={3} defaultValue={sl.text} /></div>
          <div className="field"><label>Buttons</label>
            {[...btns, { label: '', href: '' }].map((b, k) => <div key={k} className="row2" style={{ gap: 8, flexWrap: 'wrap' }}>
              <input name={`bl-${i}`} defaultValue={b.label} placeholder={k < btns.length ? 'Button text' : 'New button text'} maxLength={40} style={{ flex: '1 1 140px' }} />
              <input name={`bh-${i}`} defaultValue={b.href} placeholder="Link, e.g. /shop" list="links" style={{ flex: '2 1 200px' }} />
              {k < btns.length && <label style={{ fontSize: '.8rem' }}><input type="checkbox" name={`bd-${i}-${k}`} /> Remove</label>}
            </div>)}
            <small className="muted">To add a button, fill the empty row and save; a new empty row appears each time. Leave the text empty for no button.</small>
          </div>
          <details><summary className="muted" style={{ cursor: 'pointer' }}>More options</summary>
            <div className="two" style={{ marginTop: 12 }}>
              <div className="field"><label>Small heading above</label><input name={`eyebrow-${i}`} defaultValue={sl.eyebrow} /></div>
              <div className="field"><label>Headline, second line (italic)</label><input name={`italic-${i}`} defaultValue={sl.italic} /></div>
              <div className="field"><label>Show a product when there is no media</label><select name={`product-${i}`} defaultValue={sl.product}><option value="">None</option>{products.map(p => <option key={p.id} value={p.slug}>{p.name} · {p.sub}</option>)}</select></div>
              <div className="field"><label>How it moves in</label><select name={`motion-${i}`} defaultValue={sl.motion || 'fade'}>{MOTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
            </div>
          </details>
        </fieldset>;
      })}
      <div className="field" style={{ maxWidth: 320 }}><label>Collection icons (under this section)</label><select name="catStyle" defaultValue={s.catStyle}>{CAT_STYLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select><small className="muted">Each collection&apos;s icon picture is set in Categories.</small></div>
      <div className="row2"><button className="btn">Save</button><button className="btn ghost" name="add" value="1">Add an item without media</button></div>
    </form>
  </>;
}
