// Built-in product drawings, used until a real photo is uploaded. Returns SVG markup strings
// that reference the gradients in <ArtDefs />.
export type ArtProduct = { kind: string; finish?: string; name: string; brand?: string };
const esc = (t: string) => t.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c] as string));

function barrel(s: number) {
  const h = 16 * s, r = h / 2;
  const tail = 6 * s, body = 102 * s, collar = 9 * s, stick = 20 * s, fib = 11 * s;
  const sh = 9.5 * s; // stick thickness
  let x = 0, out = '';
  // shadow
  out += `<rect x="${12*s}" y="${h*0.9}" width="${tail+body+collar+stick}" height="${h*0.55}" rx="${h*0.3}" fill="rgba(70,50,20,.32)" filter="url(#shadow)"/>`;
  // tail wheel (brass)
  out += `<path d="M ${tail} 0 H ${r*0.7} Q 0 0 0 ${r} Q 0 ${h} ${r*0.7} ${h} H ${tail} Z" fill="url(#brass)"/>`;
  out += `<rect x="${s}" y="0" width="${tail-1.6*s}" height="${h}" fill="url(#knurl)"/>`;
  x = tail;
  // body
  out += `<rect x="${x}" y="0" width="${body}" height="${h}" fill="url(#alu)"/>`;
  out += `<rect x="${x}" y="0" width="${body}" height="${h}" fill="url(#brush)"/>`;
  out += `<rect x="${x}" y="0" width="${0.6*s}" height="${h}" fill="rgba(60,45,25,.35)"/>`;
  x += body;
  // stick + fibers (drawn before collar so collar overlaps)
  const sy = (h - sh) / 2;
  out += `<rect x="${x}" y="${sy}" width="${collar+stick}" height="${sh}" fill="url(#wood)"/>`;
  for (const f of [0.28, 0.52, 0.74]) {
    out += `<line x1="${x+collar}" y1="${sy+sh*f}" x2="${x+collar+stick}" y2="${sy+sh*(f+0.04)}" stroke="rgba(70,40,15,.28)" stroke-width="${0.3*s}"/>`;
  }
  const fx = x + collar + stick;
  let fibers = '';
  for (let i = 0; i <= 22; i++) {
    const y = sy + 0.4*s + (sh - 0.8*s) * i / 22;
    const len = fib * (0.75 + 0.25 * Math.sin(i * 1.7) * Math.sin(i * 0.6) + 0.12);
    const spread = (i - 11) * 0.12 * s;
    fibers += `<line x1="${fx-0.5*s}" y1="${y}" x2="${fx+len}" y2="${y+spread}" stroke="url(#fiber)" stroke-width="${0.55*s}" stroke-linecap="round" opacity="${0.75+0.25*((i*7)%3)/2}"/>`;
  }
  out += `<g>${fibers}</g>`;
  out += `<rect x="${fx-0.6*s}" y="${sy}" width="${1.2*s}" height="${sh}" fill="#e2cda6"/>`;
  // twist collar (knurled alu, a hair slimmer)
  const cy = 0.35 * s;
  out += `<rect x="${x}" y="${cy}" width="${collar}" height="${h-2*cy}" rx="${0.8*s}" fill="url(#alu)"/>`;
  out += `<rect x="${x}" y="${cy}" width="${collar}" height="${h-2*cy}" rx="${0.8*s}" fill="url(#knurl)"/>`;
  out += `<rect x="${x+collar-0.9*s}" y="${cy}" width="${0.9*s}" height="${h-2*cy}" fill="url(#brass)"/>`;
  return out;
}

function cap(s: number) {
  const h = 16.6 * s, r = h / 2;
  const body = 44 * s, crown = 5 * s;
  let out = '';
  out += `<rect x="${10*s}" y="${h*0.9}" width="${body+crown-10*s}" height="${h*0.55}" rx="${h*0.3}" fill="rgba(70,50,20,.32)" filter="url(#shadow)"/>`;
  // body (open end on left)
  out += `<rect x="0" y="0" width="${body}" height="${h}" fill="url(#alu)"/>`;
  out += `<rect x="0" y="0" width="${body}" height="${h}" fill="url(#brush)"/>`;
  out += `<rect x="0" y="0" width="${0.9*s}" height="${h}" fill="url(#brass)"/>`;
  // crown with roller
  out += `<path d="M ${body} 0 H ${body+crown-r*0.5} Q ${body+crown+r*0.25} 0 ${body+crown+r*0.25} ${r} Q ${body+crown+r*0.25} ${h} ${body+crown-r*0.5} ${h} H ${body} Z" fill="url(#brass)"/>`;
  out += `<circle cx="${body+crown+r*0.2}" cy="${r}" r="${2.6*s}" fill="url(#brass)" stroke="rgba(60,40,15,.5)" stroke-width="${0.3*s}"/>`;
  out += `<circle cx="${body+crown+r*0.05}" cy="${r-0.9*s}" r="${0.8*s}" fill="rgba(255,248,220,.85)"/>`;
  // clip (brass), runs from crown toward open end, sits on top edge
  const cw = 3.2 * s;
  out += `<path d="M ${body+1.5*s} ${-0.4*s} H ${12*s} Q ${7*s} ${-0.4*s} ${7*s} ${cw*0.6} Q ${7*s} ${cw*1.25} ${11*s} ${cw*1.25} H ${body+1.5*s} Z" fill="url(#brass)"/>`;
  out += `<circle cx="${9.5*s}" cy="${cw*0.65}" r="${1.9*s}" fill="url(#brass)" stroke="rgba(60,40,15,.35)" stroke-width="${0.25*s}"/>`;
  return out;
}

function closedPen(s: number) {
  // capped pen: barrel body + cap, 152 mm overall
  const h = 16 * s, r = h / 2, tail = 6 * s, body = 104 * s;
  let out = `<rect x="${12*s}" y="${h*0.9}" width="${150*s}" height="${h*0.55}" rx="${h*0.3}" fill="rgba(70,50,20,.3)" filter="url(#shadow)"/>`;
  out += `<path d="M ${tail} 0 H ${r*0.7} Q 0 0 0 ${r} Q 0 ${h} ${r*0.7} ${h} H ${tail} Z" fill="url(#brass)"/>`;
  out += `<rect x="${s}" y="0" width="${tail-1.6*s}" height="${h}" fill="url(#knurl)"/>`;
  out += `<rect x="${tail}" y="0" width="${body}" height="${h}" fill="url(#alu)"/>`;
  out += `<rect x="${tail}" y="0" width="${body}" height="${h}" fill="url(#brush)"/>`;
  out += `<g transform="translate(${tail+body-1*s} ${-0.3*s})">${cap(s).replace(/<rect[^>]*filter="url\(#shadow\)"\/>/, '')}</g>`;
  return out;
}

function openPen(s: number){
  return `<g transform="translate(0 ${0.3*s})">${barrel(s)}</g><g transform="translate(${170*s} ${-0.3*s})">${cap(s)}</g>`;
}
export function penSVG(p: ArtProduct, open: boolean, cls?: string){
  const s = 3;
  let g = open ? openPen(s) : closedPen(s);
  if (p.finish === 'alug') g = g.replace(/url\(#alu\)/g, 'url(#alug)');
  if (p.finish === 'brassb') g = g.replace(/url\(#alu\)/g, 'url(#brass)');
  const vb = open ? `-10 -30 ${232*s} 110` : `-10 -30 ${166*s} 110`;
  return `<svg class="${cls||''}" viewBox="${vb}" aria-hidden="true">${g}</svg>`;
}
function sticksSVG(cls?: string){
  let o = '';
  for (let i = 0; i < 5; i++){
    const y = 12 + i*17, x = 30 + (i%2)*16, w = 250 - (i%3)*14;
    o += `<rect x="${x}" y="${y}" width="${w}" height="12" rx="4" fill="url(#wood)"/>`;
    for (let k = 0; k < 9; k++) o += `<line x1="${x+w-2}" y1="${y+1.5+k*1.1}" x2="${x+w+16+Math.sin(k*1.7+i)*4}" y2="${y+1.5+k*1.1+(k-4)*.5}" stroke="url(#fiber)" stroke-width="1.3" stroke-linecap="round"/>`;
  }
  return `<svg class="flat ${cls||''}" viewBox="0 0 340 110" aria-hidden="true">${o}</svg>`;
}
function oilSVG(cls?: string){
  let o = '';
  [70, 160, 250].forEach((x, i) => {
    o += `<rect x="${x}" y="40" width="44" height="80" rx="8" fill="url(#oil)" opacity="${.9 - i*.12}"/>`;
    o += `<rect x="${x}" y="40" width="44" height="80" rx="8" fill="url(#glass)"/>`;
    o += `<rect x="${x+8}" y="18" width="28" height="26" rx="4" fill="url(#brass)"/>`;
    o += `<circle cx="${x+22}" cy="18" r="8" fill="url(#brass)"/>`;
  });
  return `<svg class="flat ${cls||''}" viewBox="40 0 300 140" aria-hidden="true">${o}</svg>`;
}
function giftSVG(cls?: string, brand?: string){
  return `<svg class="flat ${cls||''}" viewBox="0 0 520 260" aria-hidden="true">
    <rect x="40" y="70" width="440" height="160" rx="10" fill="url(#box)"/>
    <rect x="40" y="70" width="440" height="22" fill="rgba(255,255,255,.06)"/>
    <rect x="240" y="70" width="40" height="160" fill="url(#brass)" opacity=".9"/>
    <g transform="translate(70 30) scale(.78)">${closedPen(3)}</g>
    <text x="260" y="200" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-size="20" fill="#e8d6ad">${esc(brand || '')}</text>
  </svg>`;
}
function sleeveSVG(cls?: string){
  return `<svg class="flat ${cls||''}" viewBox="0 0 300 300" aria-hidden="true">
    <g transform="rotate(-8 150 150)">
      <rect x="132" y="22" width="34" height="80" rx="6" fill="url(#alu)"/><rect x="160" y="28" width="7" height="60" rx="3" fill="url(#brass)"/>
      <rect x="112" y="70" width="76" height="200" rx="16" fill="#6b4426"/>
      <rect x="112" y="70" width="76" height="200" rx="16" fill="url(#glass)" opacity=".35"/>
      <rect x="120" y="78" width="60" height="184" rx="11" fill="none" stroke="#d9b98a" stroke-width="1.6" stroke-dasharray="5 4"/>
    </g></svg>`;
}
export function art(p: ArtProduct, cls?: string){
  if (p.kind === 'pen') return penSVG(p, false, cls);
  if (p.kind === 'sticks') return sticksSVG(cls);
  if (p.kind === 'oil') return oilSVG(cls);
  if (p.kind === 'attar') return `<svg class="flat ${cls||''}" viewBox="0 0 200 260" aria-hidden="true"><rect x="62" y="96" width="76" height="140" rx="14" fill="url(#oil)"/><rect x="62" y="96" width="76" height="140" rx="14" fill="url(#glass)"/><rect x="80" y="62" width="40" height="38" rx="5" fill="url(#brass)"/><path d="M84 62 Q100 8 116 62Z" fill="url(#brass)"/><text x="100" y="178" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-size="13" fill="rgba(255,240,210,.85)">${esc(p.name.split(' ').slice(0, 2).join(' '))}</text></svg>`;
  if (p.kind === 'sleeve') return sleeveSVG(cls);
  return giftSVG(cls, p.brand);
}

