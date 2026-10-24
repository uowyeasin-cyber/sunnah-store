// Shared gradients and patterns for the built-in product drawings in lib/art.ts.
const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
<defs>
  <linearGradient id="alu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d7465"/><stop offset=".18" stop-color="#cfc6b4"/><stop offset=".34" stop-color="#f3eee3"/><stop offset=".5" stop-color="#d9d0bd"/><stop offset=".78" stop-color="#a39884"/><stop offset="1" stop-color="#6a6253"/></linearGradient>
  <linearGradient id="alug" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e1e1f"/><stop offset=".2" stop-color="#55565a"/><stop offset=".36" stop-color="#8c8d91"/><stop offset=".52" stop-color="#5b5c60"/><stop offset=".8" stop-color="#36373a"/><stop offset="1" stop-color="#18181a"/></linearGradient>
  <linearGradient id="brass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6e4f22"/><stop offset=".3" stop-color="#d9b46a"/><stop offset=".45" stop-color="#f6e2a9"/><stop offset=".7" stop-color="#b48a41"/><stop offset="1" stop-color="#5e421b"/></linearGradient>
  <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d4a2a"/><stop offset=".35" stop-color="#b8875a"/><stop offset=".55" stop-color="#cfa274"/><stop offset="1" stop-color="#5f3f22"/></linearGradient>
  <linearGradient id="fiber" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d7bd94"/><stop offset="1" stop-color="#efe1c4"/></linearGradient>
  <linearGradient id="oil" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a3f10"/><stop offset=".4" stop-color="#d98d35"/><stop offset=".6" stop-color="#f0b45c"/><stop offset="1" stop-color="#6b360c"/></linearGradient>
  <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="rgba(255,255,255,.15)"/><stop offset=".3" stop-color="rgba(255,255,255,.55)"/><stop offset="1" stop-color="rgba(255,255,255,.1)"/></linearGradient>
  <linearGradient id="box" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b3127"/><stop offset="1" stop-color="#1f1913"/></linearGradient>
  <pattern id="knurl" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="rgba(40,28,10,.35)" stroke-width="1.4"/></pattern>
  <pattern id="brush" width="400" height="3" patternUnits="userSpaceOnUse"><rect width="400" height="1" y="0" fill="rgba(255,255,255,.07)"/><rect width="400" height="1" y="2" fill="rgba(0,0,0,.035)"/></pattern>
  <filter id="shadow" x="-20%" y="-60%" width="140%" height="260%"><feGaussianBlur stdDeviation="14"/></filter>
</defs>
</svg>`;

export default function ArtDefs() {
  return <div aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: DEFS }} />;
}
