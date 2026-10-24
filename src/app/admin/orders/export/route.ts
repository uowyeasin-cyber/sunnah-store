import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { STEPS } from '@/lib/tracking';

// CSV of the ticked orders (or the latest 1000), for couriers and spreadsheets.
export async function GET(req: Request) {
  if (!(await adminOrNull())) return new Response('Not allowed', { status: 403 });
  const ids = (new URL(req.url).searchParams.get('ids') || '').split(',').filter(Boolean);
  const list = await db.order.findMany({ where: ids.length ? { id: { in: ids } } : {}, orderBy: { createdAt: 'desc' }, take: 1000, include: { lines: true } });
  const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Order', 'Date', 'Name', 'Phone', 'Email', 'Country', 'Address', 'City', 'Items', 'Currency', 'Total', 'Payment', 'Pay status', 'Courier', 'Tracking', 'Status'];
  const rows = list.map(o => { const a = o.address as { address?: string; city?: string };
    return [o.no, o.createdAt.toISOString().slice(0, 16).replace('T', ' '), o.name, o.phone, o.email, o.country, a.address, a.city, o.lines.map(l => `${l.qty} x ${l.name}`).join('; '), o.currency, Number(o.total), o.payMethod, o.payStatus, o.courier, o.trackingNo, STEPS[o.status]]; });
  const csv = '﻿' + [head, ...rows].map(r => r.map(cell).join(',')).join('\r\n');
  return new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
