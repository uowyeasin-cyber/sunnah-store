import { adminOrNull } from '@/lib/auth';
import { getSettings } from '@/lib/catalog';
import { PRESETS } from '@/lib/settings';
import { TEMPLATES } from '@/lib/siteTemplates';
import { applyTemplate } from './actions';

export default async function Templates({ searchParams }: { searchParams: Promise<{ applied?: string }> }) {
  if (!(await adminOrNull('templates'))) return null;
  const [s, { applied }] = await Promise.all([getSettings(), searchParams]);
  const done = TEMPLATES.find(t => t.id === applied);
  return <>
    <div><h2 style={{ fontSize: '2rem' }}>Site templates</h2>
      <p className="muted">Pick the kind of business. One click changes the whole site: colours, fonts, store name and texts, menu, home page, and adds sample categories and products you then edit. You can change anything afterwards in Store & theme, Home page, Menu bar and Products, or apply another template.</p></div>
    {done && <div className="panel" style={{ borderColor: 'var(--ok)' }}><b>{done.emoji} {done.label} is now on.</b> <a href="/" target="_blank">Open the shop</a> to see it.</div>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
      {TEMPLATES.map(t => {
        const p = PRESETS[t.theme.preset], on = s.theme.preset === t.theme.preset && s.store.tagline === t.store.tagline;
        return <form key={t.id} action={applyTemplate} className="panel" style={{ margin: 0, display: 'grid', gap: 8, alignContent: 'start' }}>
          <input type="hidden" name="id" value={t.id} />
          <div style={{ height: 70, borderRadius: 10, background: p?.swatch, border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px' }}>
            <span style={{ fontSize: '2rem' }}>{t.emoji}</span>
            <span style={{ width: 26, height: 26, borderRadius: '50%', background: t.theme.accent || p?.vars?.['--accent'] || '#9a7a45' }} />
          </div>
          <h3 style={{ margin: 0 }}>{t.label}{on && <span className="muted" style={{ fontSize: '.8rem' }}> · in use</span>}</h3>
          <p className="muted" style={{ fontSize: '.85rem', margin: 0 }}>{t.who}</p>
          <p style={{ fontSize: '.8rem', margin: 0 }}>{p?.label} · {t.theme.font} · {t.cats.map(c => c[1]).join(', ')}</p>
          <label style={{ fontSize: '.82rem' }}><input type="checkbox" name="samples" defaultChecked /> Add sample categories & products</label>
          <label style={{ fontSize: '.82rem' }}><input type="checkbox" name="hideOld" /> Hide my current products (archived, can be restored)</label>
          <label style={{ fontSize: '.82rem' }}><input type="checkbox" name="keepName" defaultChecked /> Keep my store name ({s.store.name})</label>
          <div><button className="btn">Use this template</button></div>
        </form>;
      })}
    </div>
  </>;
}
