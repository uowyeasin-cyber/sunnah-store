'use server';
import { updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { normCode, type Welcome } from '@/lib/coupons';
import { badgeFrom } from '@/lib/badges';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const num = (fd: FormData, k: string) => Number(fd.get(k)) || 0;
const back = (note: string): never => redirect('/admin/offers?note=' + encodeURIComponent(note));
const HOURS: Record<string, number> = { none: 0, '24h': 24, '3d': 72, '1w': 168, '2w': 336 };

// The badge text written from the offer, so it always matches what the customer gets.
export async function badgeFor(kind: string, a: number, b: number) {
  return kind === 'bxgy' ? `Buy ${a} Get ${b} FREE` : kind === 'usd' ? `$${a} OFF` : `${a}% OFF`;
}

async function applyOffer(ids: string[], o: { kind: string; pct: number; buy: number; get: number; usd: number; label: string; style: string; hours: number; on: boolean }) {
  const products = await db.product.findMany({ where: { id: { in: ids } }, select: { id: true, priceCents: true } });
  const endsAt = o.hours ? new Date(Date.now() + o.hours * 3600e3) : null;
  for (const p of products) {
    // "$ off each item" becomes the matching percent for that product's price.
    const pct = o.kind === 'pct' ? o.pct : o.kind === 'usd' ? Math.min(90, Math.round(((o.usd * 100) / p.priceCents) * 100)) : 0;
    const data = { on: o.on, label: o.label, pct, buy: o.kind === 'bxgy' ? o.buy : 0, get: o.kind === 'bxgy' ? o.get : 0, style: o.style, endsAt };
    await db.offer.upsert({ where: { productId: p.id }, update: data, create: { ...data, productId: p.id } });
  }
  updateTag('catalog');
  return products.length;
}

export async function createOffer(fd: FormData) {
  const kind = ['bxgy', 'pct', 'usd'].includes(str(fd, 'kind')) ? str(fd, 'kind') : 'pct';
  const buy = Math.max(1, Math.min(10, num(fd, 'buy'))), get = Math.max(1, Math.min(10, num(fd, 'get')));
  const pct = Math.max(1, Math.min(90, num(fd, 'pct'))), usd = Math.max(0.5, num(fd, 'usd'));
  const applies = str(fd, 'applies'), target = str(fd, 'target');
  await requireAdmin('offers', 'createOffer', `${kind} ${applies} ${target}`);
  const where = applies === 'cat' ? { categoryId: target, archived: false } : applies === 'product' ? { id: target } : { active: true, archived: false };
  const ids = (await db.product.findMany({ where, select: { id: true } })).map(p => p.id);
  if (!ids.length) back('No products matched. Pick a category or product.');
  const label = str(fd, 'label') || await badgeFor(kind, kind === 'bxgy' ? buy : kind === 'usd' ? usd : pct, get);
  const n = await applyOffer(ids, { kind, pct, buy, get, usd, label, style: badgeFrom(fd, 'style'), hours: HOURS[str(fd, 'hours')] ?? 0, on: !!fd.get('on') });
  back(`Offer "${label}" set on ${n} product${n === 1 ? '' : 's'}. Offers never stack: each product keeps one.`);
}

// Suggested when nothing is on sale: 10% off everything for 48 hours, with a countdown.
export async function allowFlashSale() {
  await requireAdmin('offers', 'allowFlashSale');
  const ids = (await db.product.findMany({ where: { active: true, archived: false, offer: null }, select: { id: true } })).map(p => p.id);
  const n = await applyOffer(ids, { kind: 'pct', pct: 10, buy: 0, get: 0, usd: 0, label: 'FLASH SALE · 10% OFF', style: 'timer', hours: 48, on: true });
  back(`Weekend sale is live on ${n} products for 48 hours.`);
}

export async function stopOffer(fd: FormData) {
  const id = str(fd, 'id');
  await requireAdmin('offers', 'stopOffer', id);
  if (id === 'all') await db.offer.deleteMany({}); else await db.offer.deleteMany({ where: { productId: id } });
  updateTag('catalog');
  back(id === 'all' ? 'All offers stopped.' : 'Offer stopped.');
}

export async function createCoupon(fd: FormData) {
  const code = normCode(str(fd, 'code'));
  await requireAdmin('offers', 'createCoupon', code);
  if (code.length < 3) back('Write a code of at least 3 letters or numbers.');
  if (await db.coupon.findUnique({ where: { code } })) back(`The code ${code} already exists. Pick another.`);
  const kind = str(fd, 'kind') === 'amount' ? 'amount' : 'pct';
  const value = kind === 'pct' ? Math.max(1, Math.min(90, num(fd, 'value'))) : Math.max(50, Math.round(num(fd, 'value') * 100));
  const days = num(fd, 'days');
  await db.coupon.create({ data: { code, kind, value, minCents: Math.round(num(fd, 'min') * 100), maxUses: Math.max(0, Math.floor(num(fd, 'uses'))), note: str(fd, 'note').slice(0, 120), endsAt: days > 0 ? new Date(Date.now() + days * 864e5) : null } });
  back(`Coupon ${code} is live. Share it in posts, messages or ads.`);
}

export async function couponAction(fd: FormData) {
  const id = str(fd, 'id'), what = str(fd, 'what');
  await requireAdmin('offers', 'coupon-' + what, id);
  if (what === 'delete') await db.coupon.delete({ where: { id } });
  else { const c = await db.coupon.findUniqueOrThrow({ where: { id } }); await db.coupon.update({ where: { id }, data: { on: !c.on } }); }
  back(what === 'delete' ? 'Coupon deleted.' : 'Coupon updated.');
}

export async function saveWelcome(fd: FormData) {
  await requireAdmin('offers', 'saveWelcome');
  const w: Welcome = fd.get('recommended')
    ? { on: true, pct: 10, minUsd: 20, days: 14, line: str(fd, 'line') }
    : { on: !!fd.get('on'), pct: Math.max(1, Math.min(50, num(fd, 'pct'))), minUsd: Math.max(0, num(fd, 'minUsd')), days: Math.max(1, Math.min(90, num(fd, 'days'))), line: str(fd, 'line').slice(0, 160) };
  await db.setting.upsert({ where: { key: 'welcome' }, update: { value: w }, create: { key: 'welcome', value: w } });
  back(w.on ? `Welcome gift on: every new customer gets ${w.pct}% off by email.` : 'Welcome gift off.');
}
