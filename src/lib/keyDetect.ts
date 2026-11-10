// Works out which service a pasted key belongs to, so the owner can paste keys
// into one box instead of finding the right field. Pure: no database, easy to test.
import { SERVICES } from './keys';
import { PROVIDERS } from './ai';

export type Found = { env: string; value: string; service: string };

// Every field the store can save, with the name of its service.
export function allFields() {
  const out: { env: string; label: string; service: string }[] = [];
  for (const s of SERVICES) for (const [env, label, kind] of s.fields) if (!Array.isArray(kind)) out.push({ env, label, service: s.name });
  for (const p of PROVIDERS) if (!out.some(f => f.env === p.env)) out.push({ env: p.env, label: 'API key', service: p.name });
  return out;
}

// Keys whose look alone says what they are. Order matters: more specific first.
const SHAPES: [RegExp, string][] = [
  [/^(sk|rk)_(live|test)_[A-Za-z0-9]{20,}$/, 'STRIPE_SECRET_KEY'],
  [/^whsec_[A-Za-z0-9]{20,}$/, 'STRIPE_WEBHOOK_SECRET'],
  [/^sk-ant-[\w-]{20,}$/, 'ANTHROPIC_API_KEY'],
  [/^sk-or-[\w-]{20,}$/, 'OPENROUTER_API_KEY'],
  [/^gsk_[A-Za-z0-9]{20,}$/, 'GROQ_API_KEY'],
  [/^(AIza[\w-]{30,}|AQ\.[\w.-]{20,})$/, 'GEMINI_API_KEY'],
  [/^shippo_(live|test)_[a-f0-9]{20,}$/, 'SHIPPO_TOKEN'],
  [/^amzn1\.sp\.solution\.[\w-]+$/, 'AMAZON_APP_ID'],
  [/^amzn1\.application-oa2-client\.[a-f0-9]+$/, 'AMAZON_LWA_CLIENT_ID'],
  [/^amzn1\.oa2-cs\.v1\.[a-f0-9]+$/, 'AMAZON_LWA_CLIENT_SECRET'],
  [/^[\w]+-[\w]+-PRD-[a-f0-9]{6,}-[a-f0-9]{6,}$/i, 'EBAY_CLIENT_ID'],
  [/^PRD-[a-f0-9]{8,}-[a-f0-9-]{8,}$/i, 'EBAY_CLIENT_SECRET'],
  [/^CJ\d+@api@[a-f0-9]{16,}$/i, 'CJ_API_KEY'],
  [/^EAA[A-Za-z0-9]{50,}$/, 'META_PAGE_TOKEN'],
  [/^A[A-Za-z0-9_-]{70,90}$/, 'PAYPAL_CLIENT_ID'],
  [/^E[A-Za-z0-9_-]{70,90}$/, 'PAYPAL_SECRET'],
];

// Other names people use for the same thing in .env files and dashboards.
const ALIASES: Record<string, string> = {
  GOOGLE_API_KEY: 'GEMINI_API_KEY', GOOGLE_GENERATIVE_AI_API_KEY: 'GEMINI_API_KEY', GEMINI_KEY: 'GEMINI_API_KEY',
  CLAUDE_API_KEY: 'ANTHROPIC_API_KEY', STRIPE_SECRET: 'STRIPE_SECRET_KEY', STRIPE_KEY: 'STRIPE_SECRET_KEY',
  PAYPAL_CLIENT_SECRET: 'PAYPAL_SECRET', SHIPPO_API_KEY: 'SHIPPO_TOKEN', CJ_KEY: 'CJ_API_KEY',
};

const clean = (v: string) => v.trim().replace(/^["'`]|["'`,;]$/g, '').replace(/["'`]$/, '').trim();

// Reads "NAME=value" / "NAME: value" lines, JSON objects and bare keys.
export function detectKeys(text: string): { found: Found[]; unknown: string[] } {
  const fields = allFields(), byEnv = new Map(fields.map(f => [f.env, f]));
  const found = new Map<string, Found>(), unknown: string[] = [];
  const put = (env: string, value: string) => {
    const f = byEnv.get(ALIASES[env] || env), v = clean(value);
    if (!f || !v) return false;
    found.set(f.env, { env: f.env, value: v.slice(0, 500), service: f.service });
    return true;
  };
  const t = text.trim();
  if (t.startsWith('{')) try {
    const o = JSON.parse(t) as Record<string, unknown>;
    for (const [k, v] of Object.entries(o)) if (typeof v === 'string' || typeof v === 'number') put(k.toUpperCase(), String(v));
    if (found.size) return { found: [...found.values()], unknown };
  } catch { /* not JSON, read it as text */ }
  for (const raw of t.split(/\r?\n/)) {
    const line = raw.trim().replace(/^export\s+/, '');
    if (!line || line.startsWith('#')) continue;
    const named = line.match(/^([A-Za-z][\w]*)\s*[=:]\s*(.+)$/);
    if (named && put(named[1].toUpperCase(), named[2])) continue;
    for (const tok of (named ? named[2] : line).split(/\s+/).map(clean).filter(x => x.length >= 16)) {
      const hit = SHAPES.find(([re]) => re.test(tok));
      if (hit && !found.has(hit[1])) put(hit[1], tok);
      else if (!hit) unknown.push(tok);
    }
  }
  return { found: [...found.values()], unknown };
}
