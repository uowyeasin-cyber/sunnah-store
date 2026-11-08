import { BADGES, parseBadge } from '@/lib/badges';

// Tap a preview to pick the offer badge; optional own background and text colour for any look.
export default function BadgePicker({ name, value, label }: { name: string; value: string; label?: string }) {
  const cur = parseBadge(value);
  const text = (label || 'Sale −15%').slice(0, 18);
  return <div>
    <div className="badge-pick" role="radiogroup" aria-label="Badge look">
      {BADGES.map(([k, l]) => { const cls = k.startsWith('ribbon-') ? `ribbon ${k}` : k; return <label key={k}>
        <input type="radio" name={name} value={k} defaultChecked={cur.look === k} />
        <span className={`bp-box ${k === 'glow' ? 'glow' : ''}`}>{k !== 'glow' && <span className={`offer ${cls}`}>{k === 'corner' ? <span>{text}</span> : k === 'timer' ? <><span>{text}</span><span>2d</span></> : text}</span>}</span>
        {l}</label>; })}
    </div>
    <div className="badge-colors">
      <label className="row2" style={{ gap: 6 }}><input type="checkbox" name="badgeOwn" defaultChecked={!!(cur.bg || cur.fg)} /> Use my colours</label>
      <label className="row2" style={{ gap: 6 }}>Background <input type="color" name="badgeBg" defaultValue={cur.bg || '#c62828'} /></label>
      <label className="row2" style={{ gap: 6 }}>Text <input type="color" name="badgeFg" defaultValue={cur.fg || '#ffffff'} /></label>
      <span className="muted sm">The label text is what you type in Label.</span>
    </div>
  </div>;
}
