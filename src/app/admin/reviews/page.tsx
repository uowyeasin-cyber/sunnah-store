import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { editReview, setReview } from '../actions';

export default async function Reviews() {
  if (!(await adminOrNull())) return null;
  const list = await db.review.findMany({ orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], include: { product: true }, take: 200 });
  return <>
    <div><div className="kicker">Admin</div><h2 style={{ fontSize: '2rem' }}>Reviews</h2></div>
    <p className="muted" style={{ fontSize: '.88rem' }}>Every product page has a “Write a review” form. New reviews wait here for approval when “Hold new reviews until approved” is on in Design &amp; settings. {list.filter(r => r.status === 'pending').length} waiting · {list.filter(r => r.stars >= 4).length} good · {list.filter(r => r.stars <= 2).length} bad.</p>
    <div className="panel"><div className="tbl-wrap"><table><thead><tr><th>Review</th><th>Product</th><th>Status</th><th></th></tr></thead><tbody>
      {list.map(r => <tr key={r.id}>
        <td style={{ minWidth: 240 }}><span className="stars">{'★'.repeat(r.stars)}</span><br />{r.text}<div className="muted" style={{ fontSize: '.78rem' }}>{r.name} · {r.place}{r.verified ? ' · verified buyer' : ''}</div>
          {r.media.length > 0 && <div className="thumbs">{r.media.map(m => /\.(mp4|webm|mov)$/i.test(m) ? <video key={m} src={m} controls /> : <img key={m} src={m} alt="" />)}</div>}</td>
        <td><a href={`/p/${r.product.slug}`} target="_blank">{r.product.name}</a><div className="muted" style={{ fontSize: '.78rem' }}>{r.product.sub}</div></td>
        <td><span className={`status ${r.status === 'live' ? 'live' : 'hidden'}`}>{r.status}</span></td>
        <td style={{ whiteSpace: 'nowrap' }}><form action={setReview} style={{ display: 'flex', gap: 6 }}><input type="hidden" name="id" value={r.id} />
          {r.status !== 'live' ? <button className="btn sm" name="to" value="live">Approve</button> : <button className="btn ghost sm" name="to" value="hidden">Hide</button>}<button className="btn ghost sm" name="to" value="delete">Delete</button></form>
          <details className="edit-review"><summary className="btn ghost sm">Edit</summary>
            <form action={editReview} style={{ display: 'grid', gap: 10, marginTop: 10, minWidth: 280 }}><input type="hidden" name="id" value={r.id} />
              <div className="field"><label>Name</label><input name="name" defaultValue={r.name} /></div>
              <div className="field"><label>Place</label><input name="place" defaultValue={r.place} /></div>
              <div className="field"><label>Stars</label><select name="stars" defaultValue={r.stars}>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{'★'.repeat(n)}</option>)}</select></div>
              <div className="field"><label>Review</label><textarea name="text" rows={4} defaultValue={r.text} /></div>
              <div className="field"><label>Date</label><input name="date" type="date" defaultValue={r.createdAt.toISOString().slice(0, 10)} /></div>
              <div className="field"><label>Status</label><select name="status" defaultValue={r.status}><option value="live">Live</option><option value="pending">Waiting</option><option value="hidden">Hidden</option></select></div>
              <label style={{ fontSize: '.85rem' }}><input type="checkbox" name="verified" defaultChecked={r.verified} /> Verified buyer</label>
              {r.media.map(m => <label key={m} style={{ fontSize: '.8rem' }}><input type="checkbox" name="dropMedia" value={m} /> Remove {/\.(mp4|webm|mov)$/i.test(m) ? 'video' : 'photo'} {m.split('/').pop()?.slice(0, 24)}</label>)}
              <button className="btn sm">Save review</button>
            </form></details></td>
      </tr>)}
    </tbody></table></div></div>
  </>;
}
