import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { setReview } from '../actions';

export default async function Reviews() {
  if (!(await adminOrNull())) return null;
  const list = await db.review.findMany({ orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], include: { product: true }, take: 200 });
  return <>
    <div><div className="kicker">Admin</div><h2 style={{ fontSize: '2rem' }}>Reviews</h2></div>
    <div className="panel"><div className="tbl-wrap"><table><thead><tr><th>Review</th><th>Product</th><th>Status</th><th></th></tr></thead><tbody>
      {list.map(r => <tr key={r.id}>
        <td style={{ minWidth: 240 }}><span className="stars">{'★'.repeat(r.stars)}</span><br />{r.text}<div className="muted" style={{ fontSize: '.78rem' }}>{r.name} · {r.place}{r.verified ? ' · verified buyer' : ''}</div>
          {r.media.length > 0 && <div className="thumbs">{r.media.map(m => /\.(mp4|webm|mov)$/i.test(m) ? <video key={m} src={m} controls /> : <img key={m} src={m} alt="" />)}</div>}</td>
        <td>{r.product.name}<div className="muted" style={{ fontSize: '.78rem' }}>{r.product.sub}</div></td>
        <td><span className={`status ${r.status === 'live' ? 'live' : 'hidden'}`}>{r.status}</span></td>
        <td style={{ whiteSpace: 'nowrap' }}><form action={setReview} style={{ display: 'flex', gap: 6 }}><input type="hidden" name="id" value={r.id} />
          {r.status !== 'live' ? <button className="btn sm" name="to" value="live">Approve</button> : <button className="btn ghost sm" name="to" value="hidden">Hide</button>}<button className="btn ghost sm" name="to" value="delete">Delete</button></form></td>
      </tr>)}
    </tbody></table></div></div>
  </>;
}
