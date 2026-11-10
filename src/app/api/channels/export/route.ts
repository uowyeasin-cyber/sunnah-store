import { NextRequest } from 'next/server';
import { adminOrNull } from '@/lib/auth';
import { db } from '@/lib/db';
import { getSettings } from '@/lib/catalog';
import { convert } from '@/lib/money';
import { channel } from '@/lib/channels';

// Product file for any marketplace's bulk upload: one row per product, SKU = our product slug (keep it the same there,
// so stock, prices and orders link up). Prices in the marketplace's currency where we have a rate, else USD.
const cell = (v: unknown) => { const s = String(v ?? '').replace(/\r?\n/g, ' ').trim(); return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export async function GET(req: NextRequest) {
  if (!(await adminOrNull('channels'))) return new Response('Sign in to the admin first', { status: 401 });
  const ch = channel(req.nextUrl.searchParams.get('ch') || '');
  const cur = ch?.cur || 'USD';
  const site = process.env.SITE_URL || req.nextUrl.origin;
  const [s, list] = await Promise.all([getSettings(), db.product.findMany({ where: { archived: false }, orderBy: [{ sort: 'asc' }, { name: 'asc' }], include: { category: true } })]);
  const wh = cur === 'BDT' ? 'BD' : cur === 'MYR' ? 'MY' : 'US';
  const img = (u: string) => (u.startsWith('http') ? u : `${site}${u}`);
  const head = ['SellerSku', 'Name', 'Short description', 'Description', 'Category', 'Brand', `Price (${cur})`, 'Quantity', 'Main image', 'Image 2', 'Image 3', 'Image 4', 'Image 5', 'Product link', 'Active'];
  const rows = list.map(p => [p.slug, p.name, p.sub, p.details, p.category.name, s.store.name, convert(p.priceCents, cur, s.rates), Math.max(0, Number((p.stock as Record<string, number>)[wh] || 0)), ...[0, 1, 2, 3, 4].map(i => (p.images[i] ? img(p.images[i]) : '')), `${site}/p/${p.slug}`, p.active ? 'yes' : 'no']);
  const csv = '﻿' + [head, ...rows].map(r => r.map(cell).join(',')).join('\r\n');
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="products-${ch?.id || 'all'}.csv"` } });
}
