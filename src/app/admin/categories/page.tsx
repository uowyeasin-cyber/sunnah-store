import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { saveCategories } from '../actions';

export default async function Categories() {
  if (!(await adminOrNull('categories'))) return null;
  const cats = await db.category.findMany({ orderBy: { sort: 'asc' }, include: { _count: { select: { products: true } } } });
  return <>
    <div><h2 style={{ fontSize: '2rem' }}>Categories</h2></div>
    <form className="panel" action={saveCategories}>
      <p className="muted" style={{ fontSize: '.88rem' }}>Each category shows as a round icon under the showcase on the home page: upload a square picture for it (otherwise its first product photo is used). A new category is added to the menu bar automatically. A category can be deleted once it has no products.</p>
      <div className="tbl-wrap"><table><thead><tr><th>Icon</th><th>Name</th><th>Order</th><th>Products</th><th>Delete</th></tr></thead><tbody>
        {cats.map((c, i) => <tr key={c.id}><td style={{ minWidth: 200 }}>{c.image ? <img src={c.image} alt="" style={{ width: 48, height: 48, borderRadius: 14, objectFit: 'cover', display: 'block', marginBottom: 6 }} /> : null}<input type="file" name={`icon-${i}`} accept="image/*" style={{ maxWidth: 190 }} />{c.image && <label style={{ fontSize: '.75rem' }}><input type="checkbox" name={`clearIcon-${i}`} /> Remove</label>}</td><td><input type="hidden" name="id" value={c.id} /><input name={`name-${i}`} defaultValue={c.name} style={{ maxWidth: 240 }} /></td><td><input name={`sort-${i}`} type="number" defaultValue={c.sort} style={{ width: 70 }} /></td><td className="num">{c._count.products}</td><td><input type="checkbox" name={`del-${i}`} disabled={c._count.products > 0} /></td></tr>)}
      </tbody></table></div>
      <div className="field" style={{ maxWidth: 320 }}><label>Add a category</label><input name="newName" placeholder="Prayer essentials" /></div>
      <div><button className="btn">Save categories</button></div>
    </form>
  </>;
}
