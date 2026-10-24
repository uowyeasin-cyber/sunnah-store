import { type NextRequest } from 'next/server';
import { adminOrNull } from '@/lib/auth';
import { isCurrency } from '@/lib/money';
import { PERIODS, report, type Period } from '@/lib/reports';
import { STEPS } from '@/lib/tracking';

// Reports as a spreadsheet: the summary, then every order in the period.
export async function GET(req: NextRequest) {
  if (!(await adminOrNull())) return new Response('Not allowed', { status: 403 });
  const q = req.nextUrl.searchParams;
  const p = (PERIODS.includes(q.get('p') as Period) ? q.get('p') : 'month') as Period;
  const cur = isCurrency(q.get('cur')) ? (q.get('cur') as 'USD') : 'USD';
  const tz = Number(q.get('tz')) || 0, d = q.get('d');
  const r = await report(p, d && !isNaN(Date.parse(d)) ? new Date(d + 'T12:00:00Z') : new Date(), cur, tz);
  const n = (x: number) => x.toFixed(2);
  const rows: (string | number)[][] = [
    [`${p} report`, r.title, `amounts in ${cur}`], [],
    ['Sales', n(r.now.revenue)], ['Cost of products sold', n(r.now.cogs)], ['Gross profit', n(r.now.gross)], ['Rewards given', n(r.now.rewards)],
    ['Refunds', n(r.now.refunds)], ['Expenses', n(r.now.expenses)], ['Net profit', n(r.now.net)], ['Orders', r.now.orders], ['Items sold', r.now.items], ['New customers', r.newCustomers], [],
    ['Product', 'Sold', 'Sales', 'Cost', 'Profit'], ...r.products.map(x => [x.name, x.qty, n(x.revenue), n(x.cost), n(x.profit)]), [],
    ['Source', 'Orders', 'Sales'], ...r.sources.map(x => [x.k, x.orders, n(x.revenue)]), [],
    ['Order', 'Date', 'Customer', 'Country', 'Source', 'Payment', 'Pay status', 'Status', 'Total', 'Currency', `Total in ${cur}`],
    ...r.orders.map(o => [o.no, o.at.toISOString(), o.name, o.country, o.source, o.pay, o.payStatus, STEPS[o.status], n(o.total), o.currency, n(o.inCur)]),
  ];
  const csv = rows.map(r => r.map(c => /[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c).join(',')).join('\n');
  return new Response('﻿' + csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="report-${p}-${(d || 'today')}.csv"` } });
}
