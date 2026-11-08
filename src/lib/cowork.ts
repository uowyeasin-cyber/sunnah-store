import 'server-only';
import { revalidateTag, updateTag } from 'next/cache';
import { db } from './db';
import { ask, parseJson } from './ai';
import { normCode } from './coupons';
import { lowStock } from './decisions';
import { getSettings } from './catalog';

// The AI co-worker: the owner gives it a job in plain words, it reads a snapshot of the store and
// answers with a plan of small, safe actions. In "auto" mode the plan runs by itself; in "ask" mode it waits.
export type Act = { type: string; why?: string; [k: string]: unknown };
export type Cowork = { mode: 'ask' | 'auto' };
export async function getCowork(): Promise<Cowork> {
  const r = await db.setting.findUnique({ where: { key: 'cowork' } });
  const v = (r?.value as Partial<Cowork>) || {};
  return { mode: v.mode === 'auto' ? 'auto' : 'ask' };
}

const refresh = () => { try { updateTag('catalog'); } catch { revalidateTag('catalog', 'max'); } };
const stockOf = (s: unknown) => Object.values((s as Record<string, number>) || {}).reduce((a, n) => a + (Number(n) || 0), 0);

export async function snapshot() {
  const since = new Date(Date.now() - 30 * 864e5);
  const [products, sold, orders, coupons, low] = await Promise.all([
    db.product.findMany({ where: { archived: false }, include: { offer: true }, orderBy: { sort: 'asc' }, take: 60 }),
    db.orderLine.groupBy({ by: ['productId'], where: { order: { createdAt: { gt: since }, status: { lt: 7 } } }, _sum: { qty: true } }).catch(() => []),
    db.order.groupBy({ by: ['status'], where: { createdAt: { gt: since } }, _count: true }),
    db.coupon.findMany({ where: { on: true }, take: 20, orderBy: { createdAt: 'desc' } }),
    lowStock().catch(() => []),
  ]);
  const soldBy = new Map(sold.map(s => [s.productId, s._sum.qty || 0]));
  return JSON.stringify({
    products: products.map(p => ({ slug: p.slug, name: p.name, price_usd: p.priceCents / 100, cost_usd: p.costCents / 100, stock: stockOf(p.stock), live: p.active, offer: p.offer?.on ? p.offer.label : '', sold_30d: soldBy.get(p.id) || 0 })),
    orders_30d_by_status: Object.fromEntries(orders.map(o => [o.status, o._count])),
    active_coupons: coupons.map(c => ({ code: c.code, off: c.kind === 'pct' ? `${c.value}%` : `$${c.value / 100}`, used: c.used, max: c.maxUses })),
    low_stock: low.map(l => l.name),
  });
}

const RULES = `Answer ONLY with JSON: {"reply": "short plain answer to the owner", "actions": [ ... ]}.
Allowed actions (use [] when the job needs none, e.g. a question or advice):
{"type":"create_coupon","code":"EID15","pct":15,"days":7,"uses":100,"why":"..."}   (or "usd":5 instead of "pct")
{"type":"set_offer","slugs":["slug"],"pct":10,"hours":48,"label":"10% off","why":"..."}   (slugs ["all"] = every live product)
{"type":"stop_offer","slugs":["slug"],"why":"..."}
{"type":"update_product","slug":"slug","price_usd":12.5,"name":"...","sub":"...","details":"...","why":"..."}   (only the fields to change)
{"type":"hide_product","slug":"slug","why":"..."}  {"type":"show_product","slug":"slug","why":"..."}
{"type":"note","text":"a reminder for the owner","why":"..."}
Never sell below cost, never more than 60% off, never change a price by more than half. Only use slugs from the DATA.`;

export async function planJob(prompt: string, by: string, kind = 'cowork') {
  const job = await db.aiJob.create({ data: { kind, prompt: prompt.slice(0, 2000), by, status: 'thinking' } });
  try {
    const store = (await getSettings()).store.name;
    const r = await ask(`You are the AI co-worker of ${store}, an online shop. The owner gives you jobs. Be practical and brief.\n${RULES}\n\nDATA (today ${new Date().toISOString().slice(0, 10)}):\n${await snapshot()}`, [{ role: 'user', content: prompt }], { maxTokens: 1500, json: true });
    const out = parseJson<{ reply?: string; actions?: Act[] }>(r.text);
    const actions = (Array.isArray(out?.actions) ? out!.actions : []).filter(a => a && typeof a.type === 'string').slice(0, 20);
    const auto = (await getCowork()).mode === 'auto';
    await db.aiJob.update({ where: { id: job.id }, data: { result: String(out?.reply || r.text).slice(0, 6000), actions: actions as object[], provider: r.provider, status: actions.length && !auto ? 'proposed' : 'done' } });
    if (actions.length && auto) await applyJob(job.id);
  } catch (e) {
    await db.aiJob.update({ where: { id: job.id }, data: { status: 'failed', result: (e as Error).message.slice(0, 500) } });
  }
  return job.id;
}

export async function applyJob(id: string) {
  const job = await db.aiJob.findUniqueOrThrow({ where: { id } });
  const done = await runActions((job.actions as Act[]) || []);
  await db.aiJob.update({ where: { id }, data: { status: 'done', result: `${job.result}\n\nDone:\n${done.map(d => '• ' + d).join('\n')}`.slice(0, 8000) } });
}

const n = (v: unknown) => Number(v) || 0;
export async function runActions(acts: Act[]): Promise<string[]> {
  const out: string[] = [];
  const bySlug = async (slug: unknown) => db.product.findUnique({ where: { slug: String(slug || '') } });
  for (const a of acts) {
    try {
      if (a.type === 'create_coupon') {
        const code = normCode(String(a.code || ''));
        if (code.length < 3 || await db.coupon.findUnique({ where: { code } })) { out.push(`Skipped coupon ${code || '(no code)'}: missing or already exists.`); continue; }
        const pct = Math.min(60, n(a.pct)), usd = n(a.usd);
        if (!pct && !usd) { out.push(`Skipped coupon ${code}: no amount.`); continue; }
        await db.coupon.create({ data: { code, kind: pct ? 'pct' : 'amount', value: pct ? Math.max(1, pct) : Math.max(50, Math.round(usd * 100)), maxUses: Math.max(0, Math.floor(n(a.uses))), note: 'Made by AI co-worker', endsAt: n(a.days) > 0 ? new Date(Date.now() + n(a.days) * 864e5) : null } });
        out.push(`Coupon ${code} created (${pct ? pct + '%' : '$' + usd} off).`);
      } else if (a.type === 'set_offer' || a.type === 'stop_offer') {
        const slugs = Array.isArray(a.slugs) ? a.slugs.map(String) : [];
        const ps = await db.product.findMany({ where: slugs.includes('all') ? { active: true, archived: false } : { slug: { in: slugs } } });
        if (a.type === 'stop_offer') { await db.offer.updateMany({ where: { productId: { in: ps.map(p => p.id) } }, data: { on: false } }); out.push(`Stopped offers on ${ps.length} product(s).`); continue; }
        const pct = Math.max(1, Math.min(60, n(a.pct)));
        const endsAt = n(a.hours) > 0 ? new Date(Date.now() + n(a.hours) * 3600e3) : null;
        let set = 0;
        for (const p of ps) {
          if (p.costCents && p.priceCents * (1 - pct / 100) < p.costCents) continue; // never below cost
          const data = { on: true, label: String(a.label || `${pct}% off`).slice(0, 30), pct, buy: 0, get: 0, style: endsAt ? 'timer' : 'pill', endsAt };
          await db.offer.upsert({ where: { productId: p.id }, update: data, create: { ...data, productId: p.id } }); set++;
        }
        out.push(`Offer ${pct}% off set on ${set} product(s)${set < ps.length ? ` (${ps.length - set} skipped: would sell below cost)` : ''}.`);
      } else if (a.type === 'update_product') {
        const p = await bySlug(a.slug);
        if (!p) { out.push(`Skipped: no product ${a.slug}.`); continue; }
        const data: { priceCents?: number; name?: string; sub?: string; details?: string } = {};
        if (n(a.price_usd)) {
          const c = Math.round(n(a.price_usd) * 100);
          if (c < p.priceCents / 2 || c > p.priceCents * 1.5 || (p.costCents && c < p.costCents)) out.push(`Price of ${p.name} not changed: $${c / 100} is too far from $${p.priceCents / 100} or below cost.`);
          else data.priceCents = c;
        }
        for (const k of ['name', 'sub', 'details'] as const) if (typeof a[k] === 'string' && (a[k] as string).trim()) data[k] = (a[k] as string).slice(0, k === 'details' ? 4000 : 120);
        if (Object.keys(data).length) { await db.product.update({ where: { id: p.id }, data }); out.push(`Updated ${p.name}: ${Object.keys(data).join(', ')}.`); }
      } else if (a.type === 'hide_product' || a.type === 'show_product') {
        const p = await bySlug(a.slug);
        if (!p) { out.push(`Skipped: no product ${a.slug}.`); continue; }
        await db.product.update({ where: { id: p.id }, data: { active: a.type === 'show_product' } });
        out.push(`${p.name} is now ${a.type === 'show_product' ? 'live' : 'hidden'}.`);
      } else if (a.type === 'note') out.push(`Note: ${String(a.text || '').slice(0, 300)}`);
      else out.push(`Skipped unknown action ${a.type}.`);
    } catch (e) { out.push(`Failed ${a.type}: ${(e as Error).message.slice(0, 120)}`); }
  }
  refresh();
  return out;
}
