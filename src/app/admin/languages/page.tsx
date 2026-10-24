import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { getSettings } from '@/lib/catalog';
import { dictFor, LANGS, UI_KEYS, type Lang } from '@/lib/i18n';
import { saveTranslations } from '../actions';

const OTHER: Lang[] = ['bn', 'ar', 'hi'];

// Everything a shopper reads, in English, with a box per language. Empty boxes fall back to English.
export default async function Languages() {
  if (!(await adminOrNull())) return null;
  const [s, products, cats, ads] = await Promise.all([getSettings(), db.product.findMany({ include: { offer: true }, orderBy: { sort: 'asc' } }), db.category.findMany({ orderBy: { sort: 'asc' } }), db.ad.findMany({ orderBy: { sort: 'asc' } })]);
  const content = [...new Set([
    s.store.announce, s.store.tagline, ...s.nav.map(n => n.label), ...s.slides.flatMap(x => [x.eyebrow, x.title, x.italic, x.text, x.cta]),
    ...cats.map(c => c.name), ...products.flatMap(p => [p.name, p.sub, p.details, p.offer?.label || '']), ...ads.flatMap(a => [a.kicker, a.title, a.text, a.cta]),
  ].map(x => x.trim()).filter(Boolean))].filter(x => !UI_KEYS.includes(x));
  const dicts = Object.fromEntries(OTHER.map(l => [l, dictFor(l, s.translations)]));
  let i = 0;
  const rows = (keys: string[]) => keys.map(k => { const n = i++; return (
    <tr key={n}><td style={{ minWidth: 200, maxWidth: 320 }}>{k}<input type="hidden" name={`key${n}`} value={k} /></td>
      {OTHER.map(l => <td key={l}><textarea name={`${l}${n}`} defaultValue={dicts[l][k] || ''} rows={k.length > 60 ? 3 : 1} dir={LANGS[l].dir} style={{ width: '100%', minWidth: 160, maxWidth: 'none' }} /></td>)}</tr>); });
  const head = <thead><tr><th>English</th>{OTHER.map(l => <th key={l}>{LANGS[l].label}</th>)}</tr></thead>;
  return <>
    <div><div className="kicker">Admin</div><h2 style={{ fontSize: '2rem' }}>Languages</h2><p className="muted">The shop shows in English, Bangla, Arabic and Hindi. Leave a box empty to show English. Shop text is pre-translated; your own products, slides and menu need your wording.</p></div>
    <form action={saveTranslations} style={{ display: 'grid', gap: 18 }}>
      <div className="panel"><div className="kicker">Your products, menu, slides and ads</div><div className="tbl-wrap"><table>{head}<tbody>{rows(content)}</tbody></table></div></div>
      <details className="panel"><summary className="kicker" style={{ cursor: 'pointer' }}>Shop buttons and labels ({UI_KEYS.length})</summary><div className="tbl-wrap"><table>{head}<tbody>{rows(UI_KEYS)}</tbody></table></div></details>
      <div><button className="btn">Save translations</button></div>
    </form>
  </>;
}
