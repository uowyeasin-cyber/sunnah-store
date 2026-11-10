import 'server-only';
import { key, loadKeys, saveKeys, storedKeys } from './keys';

// A linked shop's login (OAuth token), kept encrypted with the other keys under CH_TOKEN_<ID>.
export type Tok = { access: string; refresh: string; until: number; account: string; extra?: Record<string, string> };
type Who = { id: string; name: string };
const tokenName = (ch: Who) => `CH_TOKEN_${ch.id.toUpperCase().replace(/-/g, '_')}`;

export async function linked(ch: Who) {
  await loadKeys();
  try { return JSON.parse(key(tokenName(ch)) || 'null') as Tok | null; } catch { return null; }
}
export async function saveTok(ch: Who, t: Tok | null) {
  const all = await storedKeys();
  if (t) all[tokenName(ch)] = JSON.stringify(t); else delete all[tokenName(ch)];
  await saveKeys(all);
}
export const unlink = (ch: Who) => saveTok(ch, null);

// A working token: refreshed (and saved) when less than `margin` ms is left on it.
export async function fresh(ch: Who, margin: number, refresh: (t: Tok) => Promise<Tok>) {
  const t = await linked(ch);
  if (!t) throw new Error(`${ch.name} is not linked yet`);
  if (t.until - Date.now() > margin) return t;
  const n = await refresh(t);
  await saveTok(ch, n);
  return n;
}
