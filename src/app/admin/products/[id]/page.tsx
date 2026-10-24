import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { deleteProduct, saveProduct } from '../../actions';

const KINDS = [['pen', 'Pen'], ['sticks', 'Miswak sticks'], ['oil', 'Oil set'], ['attar', 'Attar bottle'], ['sleeve', 'Sleeve'], ['gift', 'Gift box']];
const STYLES = [['ribbon', 'Gold ribbon'], ['stamp', 'Black and gold seal'], ['pill', 'Ivory label'], ['glow', 'Gold glow'], ['timer', 'Countdown']];

export default async function EditProduct({ params, searchParams }: PageProps<'/admin/products/[id]'>) {
  if (!(await adminOrNull())) return null;
  const { id } = await params;
  const { saved } = (await searchParams) as { saved?: string };
  const [p, cats] = await Promise.all([id === 'new' ? null : db.product.findUnique({ where: { id }, include: { offer: true } }), db.category.findMany({ orderBy: { sort: 'asc' } })]);
  if (id !== 'new' && !p) notFound();
  const st = (p?.stock || {}) as Record<string, number>;
  const o = p?.offer;
  return <>
    <div><Link href="/admin/products" className="link-arrow">← All products</Link><h2 style={{ fontSize: '2rem', marginTop: 8 }}>{p ? p.name : 'New product'}</h2>{saved && <p className="saved">Saved.</p>}</div>
    <form className="panel" action={saveProduct}>
      <input type="hidden" name="id" value={p?.id || ''} />
      <h3>Details</h3>
      <div className="two"><div className="field"><label>Name</label><input name="name" required defaultValue={p?.name} /></div><div className="field"><label>Short line under the name</label><input name="sub" defaultValue={p?.sub} /></div></div>
      <div className="field"><label>Description</label><textarea name="details" rows={4} defaultValue={p?.details} /></div>
      <div className="two"><div className="field"><label>Price (USD)</label><input name="price" type="number" step="0.01" min="0" required defaultValue={p ? (p.priceCents / 100).toFixed(2) : ''} /></div>
        <div className="field"><label>Cost to you (USD), for profit reports</label><input name="cost" type="number" step="0.01" min="0" defaultValue={p ? (p.costCents / 100).toFixed(2) : ''} placeholder="0.00" /></div></div>
      <div className="two"><div className="field"><label>Collection</label><select name="categoryId" defaultValue={p?.categoryId}>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div /></div>
      <div className="two"><div className="field"><label>Web address (slug)</label><input name="slug" defaultValue={p?.slug} placeholder="made from the name" /></div><div className="field"><label>Order in lists</label><input name="sort" type="number" defaultValue={p?.sort ?? 0} /></div></div>
      <label className="toggle"><span>Show in the store</span><input type="checkbox" name="active" defaultChecked={p ? p.active : true} /></label>
      <h3>Stock by warehouse</h3>
      <div className="two"><div className="field"><label>USA</label><input name="stockUS" type="number" min="0" defaultValue={st.US ?? 0} /></div><div className="field"><label>Malaysia</label><input name="stockMY" type="number" min="0" defaultValue={st.MY ?? 0} /></div></div>
      <div className="field" style={{ maxWidth: 300 }}><label>Bangladesh</label><input name="stockBD" type="number" min="0" defaultValue={st.BD ?? 0} /></div>
      <h3>Photos and video</h3>
      {(p?.images.length || p?.video) ? <div className="thumbs">{p.images.map(u => <label key={u}><img src={u} alt="" /><span><input type="checkbox" name="removeImage" value={u} /> Remove</span></label>)}{p.video && <label><video src={p.video} muted /><span><input type="checkbox" name="clearVideo" /> Remove</span></label>}</div> : <p className="muted">No photos yet. The built-in drawing is shown until you add one.</p>}
      <div className="two"><div className="field"><label>Add photos</label><input type="file" name="images" accept="image/*" multiple /></div><div className="field"><label>Product video</label><input type="file" name="video" accept="video/*" /></div></div>
      <div className="two"><div className="field"><label>Drawing when there is no photo</label><select name="kind" defaultValue={p?.kind || 'gift'}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <div className="field"><label>Pen finish</label><select name="finish" defaultValue={p?.finish || ''}><option value="">—</option><option value="alu">Champagne aluminium</option><option value="alug">Graphite</option><option value="brassb">Solid brass</option></select></div></div>
      <input type="hidden" name="swatch" defaultValue={p?.swatch} />
      <h3>Offer</h3>
      <p className="muted" style={{ fontSize: '.88rem' }}>Leave the label empty for no offer. Percent off is applied at checkout; 0 shows the label only.</p>
      <div className="two"><div className="field"><label>Label</label><input name="offerLabel" defaultValue={o?.label} placeholder="Launch −15%" /></div><div className="field"><label>Percent off</label><input name="offerPct" type="number" min="0" max="90" defaultValue={o?.pct ?? 0} /></div></div>
      <div className="two"><div className="field"><label>Look</label><select name="offerStyle" defaultValue={o?.style || 'pill'}>{STYLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div><div className="field"><label>Ends on</label><input name="offerEnds" type="date" defaultValue={o?.endsAt?.toISOString().slice(0, 10)} /></div></div>
      <label className="toggle"><span>Offer is on</span><input type="checkbox" name="offerOn" defaultChecked={o ? o.on : true} /></label>
      <div className="row2"><button className="btn">Save product</button>{p && <Link className="btn ghost" href={`/p/${p.slug}`} target="_blank">View in store</Link>}</div>
    </form>
    {p && <form action={deleteProduct}><input type="hidden" name="id" value={p.id} /><button className="btn ghost sm">Delete product</button></form>}
  </>;
}
