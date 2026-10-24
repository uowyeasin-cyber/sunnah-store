// Small SVG charts for the reports page. Colours come from the --s1…--s6 tokens in globals.css.

export type Slice = { k: string; v: number };
const SERIES = 6;

// Keep the biggest slices and fold the rest into "Other", so colours stay readable.
export function fold(rows: Slice[], keep = SERIES - 1): Slice[] {
  const r = rows.filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  if (r.length <= keep + 1) return r;
  return [...r.slice(0, keep), { k: 'Other', v: r.slice(keep).reduce((a, x) => a + x.v, 0) }];
}

const pctOf = (v: number, all: number) => (all ? (v / all) * 100 : 0);
const fmtPct = (p: number) => `${p < 10 && p > 0 ? p.toFixed(1) : Math.round(p)}%`;

// Donut with a 2px gap between slices and the total in the middle.
export function Donut({ rows, size = 132, center, sub, fmt = String, colors }: { rows: Slice[]; size?: number; center?: string; sub?: string; fmt?: (n: number) => string; colors?: string[] }) {
  const all = rows.reduce((a, x) => a + x.v, 0);
  const r = 42, c = 2 * Math.PI * r, gap = rows.length > 1 ? 1.6 : 0;
  let at = 0;
  return <svg className="donut" viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={rows.map(x => `${x.k} ${fmtPct(pctOf(x.v, all))}`).join(', ') || 'No data'}>
    <circle cx="50" cy="50" r={r} className="donut-track" />
    {all > 0 && rows.map((x, i) => {
      const len = (x.v / all) * c, seg = Math.max(0.01, len - gap);
      const el = <circle key={x.k} cx="50" cy="50" r={r} className="donut-seg" style={{ stroke: colors?.[i] || `var(--s${i + 1})` }}
        strokeDasharray={`${seg} ${c - seg}`} strokeDashoffset={-at} transform="rotate(-90 50 50)">
        <title>{`${x.k}: ${fmt(x.v)} · ${fmtPct(pctOf(x.v, all))}`}</title>
      </circle>;
      at += len; return el;
    })}
    {center !== undefined && <text x="50" y={sub ? 49 : 54} className="donut-c">{center}</text>}
    {sub && <text x="50" y="62" className="donut-s">{sub}</text>}
  </svg>;
}

export function Legend({ rows, fmt = String, colors }: { rows: Slice[]; fmt?: (n: number) => string; colors?: string[] }) {
  const all = rows.reduce((a, x) => a + x.v, 0);
  if (!all) return <p className="muted" style={{ fontSize: '.85rem' }}>No data in this period.</p>;
  return <ul className="legend">{rows.map((x, i) => <li key={x.k}>
    <i style={{ background: colors?.[i] || `var(--s${i + 1})` }} /><span>{x.k}</span><b>{fmt(x.v)}</b><em>{fmtPct(pctOf(x.v, all))}</em>
  </li>)}</ul>;
}

// A donut card: title, donut, legend.
export function DonutCard({ title, rows, center, sub, fmt, colors, note }: { title: string; rows: Slice[]; center: string; sub: string; fmt?: (n: number) => string; colors?: string[]; note?: string }) {
  return <div className="dcard">
    <div className="dcard-h"><span className="label">{title}</span>{note && <small className="muted">{note}</small>}</div>
    <div className="dcard-b"><Donut rows={rows} center={center} sub={sub} fmt={fmt} colors={colors} /><Legend rows={rows} fmt={fmt} colors={colors} /></div>
  </div>;
}

// One percentage as a ring.
export function Ring({ v, size = 64, tone = '' }: { v: number | null; size?: number; tone?: '' | 'good' | 'bad' }) {
  const r = 40, c = 2 * Math.PI * r, p = v === null ? 0 : Math.max(0, Math.min(100, v));
  return <svg className={`ring ${tone}`} viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
    <circle cx="50" cy="50" r={r} className="ring-track" />
    {p > 0 && <circle cx="50" cy="50" r={r} className="ring-val" strokeDasharray={`${(p / 100) * c} ${c}`} transform="rotate(-90 50 50)" />}
    <text x="50" y="57" className="ring-t">{v === null ? '—' : fmtPct(v)}</text>
  </svg>;
}

// A thin trend line with a soft fill and the last point marked.
export function Spark({ data, w = 120, h = 36, label }: { data: number[]; w?: number; h?: number; label?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(0, ...data), span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * (w - 6) + 3, h - 4 - ((v - min) / span) * (h - 8)] as const);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return <svg className="spark" viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label={label || 'Trend'}>
    <polygon points={`3,${h - 4} ${line} ${lx},${h - 4}`} className="spark-fill" />
    <polyline points={line} className="spark-line" />
    <circle cx={lx} cy={ly} r="3" className="spark-dot" />
  </svg>;
}

// Tiny column chart for a card header.
export function MiniBars({ data, w = 120, h = 36 }: { data: number[]; w?: number; h?: number }) {
  if (!data.length) return null;
  const max = Math.max(1, ...data), bw = w / data.length;
  return <svg className="minibars" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
    {data.map((v, i) => { const bh = Math.max(v > 0 ? 2 : 0, (v / max) * (h - 2)); return <rect key={i} x={i * bw + bw * 0.18} y={h - bh} width={bw * 0.64} height={bh} rx={Math.min(2, bw * 0.3)} />; })}
  </svg>;
}

// Growth chip: ▲ 12% in green, ▼ 4% in red, — when there is nothing to compare.
export function Delta({ g, bad = false }: { g: number | null; bad?: boolean }) {
  if (g === null) return <span className="chipd">— new</span>;
  const good = (g >= 0) !== bad;
  return <span className={`chipd ${good ? 'up' : 'down'}`}>{g >= 0 ? '▲' : '▼'} {Math.abs(g).toFixed(Math.abs(g) < 10 ? 1 : 0)}%</span>;
}
