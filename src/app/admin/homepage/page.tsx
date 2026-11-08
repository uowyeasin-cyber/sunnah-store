import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { getSettings } from '@/lib/catalog';
import { saveFilm, saveSlides } from '../actions';
import { CAT_STYLES, MOTIONS } from '@/lib/settings';

export default async function Homepage() {
  if (!(await adminOrNull('homepage'))) return null;
  const [s, products] = await Promise.all([getSettings(), db.product.findMany({ orderBy: { sort: 'asc' } })]);
  return <>
    <div><h2 style={{ fontSize: '2rem' }}>Showcase: opening film</h2></div>
    <form className="panel" action={saveFilm}>
      <p className="muted" style={{ fontSize: '.88rem' }}>The first thing in the showcase at the top of the home page. It plays on its own without sound, then the showcase moves on to your photos and videos below. Upload your own video to replace it, or tick Use original to go back.</p>
      {s.film.wide && <video src={s.film.wide} poster={s.film.poster} controls muted playsInline style={{ width: '100%', maxWidth: 560, borderRadius: 'var(--r)', background: '#000' }} />}
      <label className="toggle"><span>Start the showcase with this film</span><input type="checkbox" name="on" defaultChecked={s.film.on} /></label>
      <div className="field"><label>Button text</label><input name="cta" defaultValue={s.film.cta} maxLength={40} /></div>
      {([['wide', 'Wide video, for computers (16:9)', 'video/*'], ['tall', 'Tall video, for phones (4:5 or 9:16)', 'video/*'], ['poster', 'Cover picture, shown while it loads', 'image/*']] as const).map(([k, label, accept]) =>
        <div key={k} className="field"><label>{label}</label><input type="file" name={k} accept={accept} />
          <input name={`${k}Url`} placeholder="or paste a link" defaultValue="" />
          <small className="muted">Now: {s.film[k].split('/').pop() || (k === 'tall' ? 'same as the wide video' : 'none')} · <label><input type="checkbox" name={`reset-${k}`} /> Use original</label></small></div>)}
      <div><button className="btn">Save film</button></div>
    </form>
    <div><h2 style={{ fontSize: '2rem' }}>Showcase: photos and videos</h2></div>
    <form className="panel" action={saveSlides} style={{ gap: 24 }}>
      <p className="muted" style={{ fontSize: '.88rem' }}>One section at the top of the home page. Upload as many photos and videos as you like: each becomes a slide with its own heading, description and movement. Visitors swipe or tap the arrows; it also moves on by itself.</p>
      <div className="panel" style={{ background: 'var(--bg)', borderStyle: 'dashed' }}>
        <b>Add photos and videos</b>
        <input type="file" name="newMedia" accept="image/*,video/*" multiple />
        <div className="two"><div className="field"><label>How the new ones move</label><select name="newMotion" defaultValue="zoom">{MOTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field"><label>Seconds per photo</label><input name="slideSecs" type="number" min="3" max="20" step="0.5" defaultValue={s.slideSecs} /></div></div>
        <small className="muted">Pick several files at once. After saving, write a heading and description for each one below. Videos play to the end before the next slide.</small>
      </div>
      <div className="field" style={{ maxWidth: 320 }}><label>Collection icons (under the showcase)</label><select name="catStyle" defaultValue={s.catStyle}>{CAT_STYLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select><small className="muted">Each collection's icon picture is set in Categories.</small></div>
      {s.slides.map((sl, i) => <fieldset key={sl.id} className="panel" style={{ background: 'var(--bg)' }}>
        <input type="hidden" name="id" value={sl.id} />
        <div className="row2"><h3 style={{ flex: 1 }}>Slide {String(i + 1).padStart(2, '0')}</h3>{i > 0 && <button className="btn ghost sm" name="up" value={i}>Move up</button>}<label><input type="checkbox" name={`del-${i}`} /> Delete</label></div>
        <div className="two"><div className="field"><label>Small heading (optional)</label><input name={`eyebrow-${i}`} defaultValue={sl.eyebrow} /></div>
          <div className="field"><label>Product</label><select name={`product-${i}`} defaultValue={sl.product}><option value="">None</option>{products.map(p => <option key={p.id} value={p.slug}>{p.name} · {p.sub}</option>)}</select></div></div>
        <div className="two"><div className="field"><label>Headline</label><input name={`title-${i}`} defaultValue={sl.title} /></div><div className="field"><label>Headline, italic part</label><input name={`italic-${i}`} defaultValue={sl.italic} /></div></div>
        <div className="field"><label>Description</label><textarea name={`text-${i}`} rows={3} defaultValue={sl.text} /></div>
        <div className="two"><div className="field"><label>Button text</label><input name={`cta-${i}`} defaultValue={sl.cta} /></div><div className="field"><label>Look</label><select name={`look-${i}`} defaultValue={sl.look}><option value="light">Light</option><option value="dark">Dark</option></select></div></div>
        <div className="two"><div className="field"><label>How it moves</label><select name={`motion-${i}`} defaultValue={sl.motion || 'fade'}>{MOTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field"><label>Now showing</label>{sl.video ? <video src={sl.video} muted playsInline style={{ width: 160, height: 90, objectFit: 'cover', borderRadius: 8, background: '#000' }} /> : sl.image ? <img src={sl.image} alt="" style={{ width: 160, height: 90, objectFit: 'cover', borderRadius: 8 }} /> : <small className="muted">{sl.product ? 'The product photo' : 'Nothing yet: add a photo or video'}</small>}</div></div>
        <div className="field"><label>Photo or video {sl.image || sl.video ? '(one added)' : '(optional)'}</label><input type="file" name={`media-${i}`} accept="image/*,video/*" />{(sl.image || sl.video) && <label style={{ fontSize: '.8rem' }}><input type="checkbox" name={`clear-${i}`} /> Remove media</label>}</div>
      </fieldset>)}
      <div className="row2"><button className="btn">Save showcase</button><button className="btn ghost" name="add" value="1">Add an empty slide</button></div>
    </form>
  </>;
}
