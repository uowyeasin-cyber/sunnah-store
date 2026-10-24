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
  const views = r.views.reduce((a, x) => a + x.views, 0);
  const group = (rows: { k: string; orders: number; revenue: number }[], h: string) => [[h, 'Orders', 'Sales'], ...rows.map(x => [x.k, x.orders, n(x.revenue)])];
  const parts: Record<string, (string | number)[][]> = {
    summary: [['Sales', n(r.now.revenue)], ['Net profit', n(r.now.net)], ['Orders', r.now.orders], ['Items sold', r.now.items], ['Average order', n(r.now.orders ? r.now.revenue / r.now.orders : 0)], ['New customers', r.newCustomers]],
    chart: [['When', 'Orders', 'Sales', 'Profit'], ...r.bars.map(b => [b.label, b.orders, n(b.revenue), n(b.net)])],
    pl: [['Sales', n(r.now.revenue)], ['Delivery charges', n(r.now.shipping)], ['Cost of products sold', n(r.now.cogs)], ['Gross profit', n(r.now.gross)], ['Rewards given', n(r.now.rewards)],
      ['Refunds', n(r.now.refunds)], ['Expenses', n(r.now.expenses)], ...r.expenses.map(e => [`Expense: ${e.k}`, n(e.v)]), ['Net profit', n(r.now.net)]],
    status: [['Placed', r.status.placed], ['Delivered', r.status.delivered], ['On the way', r.status.onTheWay], ['Not sent yet', r.status.notSent], ['Awaiting payment', r.status.pending], ['Payment failed', r.status.failed]],
    trend: [['Period', 'Orders', 'Sales', 'Costs', 'Expenses', 'Profit'], ...r.trend.map(t => [t.label, t.orders, n(t.revenue), n(t.cogs + t.rewards + t.refunds), n(t.expenses), n(t.net)])],
    products: [['Product', 'Sold', 'Sales', 'Cost', 'Profit'], ...r.products.map(x => [x.name, x.qty, n(x.revenue), n(x.cost), n(x.profit)])],
    sources: group(r.sources, 'Source'), countries: group(r.countries, 'Country'), methods: group(r.methods, 'Payment'), couriers: group(r.couriers, 'Courier'),
    reviews: [['New reviews', r.reviews.all], ['Average stars', r.reviews.avg.toFixed(2)], ['Good (4-5)', r.reviews.good], ['Okay (3)', r.reviews.mid], ['Bad (1-2)', r.reviews.bad], ['Waiting', r.reviews.waiting]],
    customers: [['New customers', r.newCustomers], ['Product page views', views], [], ['Product', 'Views', 'Sold', 'Good reviews', 'Bad reviews'], ...r.views.map(x => [x.name, x.views, x.sold, x.good, x.bad])],
    stock: [['Product', 'Bangladesh', 'Malaysia', 'USA', 'Total', 'Value at cost', 'Value at price'], ...r.stock.map(x => [x.name, x.BD, x.MY, x.US, x.all, n(x.value), n(x.retail)])],
    ads: [['Ad', 'Place', 'Views', 'Clicks'], ...r.ads.map(a => [a.title, a.place, a.views, a.clicks])],
    orders: [['Order', 'Date', 'Customer', 'Country', 'Source', 'Payment', 'Pay status', 'Status', 'Total', 'Currency', `Total in ${cur}`],
      ...r.orders.map(o => [o.no, o.at.toISOString(), o.name, o.country, o.source, o.pay, o.payStatus, STEPS[o.status], n(o.total), o.currency, n(o.inCur)])],
  };
  const one = q.get('s') || '';
  const rows: (string | number)[][] = [[`${p} report`, r.title, `amounts in ${cur}`], []];
  for (const [k, v] of Object.entries(parts)) if (!one || one === k) rows.push([k.toUpperCase()], ...v, []);
  const csv = rows.map(r => r.map(c => /[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c).join(',')).join('\n');
  return new Response('﻿' + csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="report-${q.get('s') || 'all'}-${p}-${(d || 'today')}.csv"` } });
}
