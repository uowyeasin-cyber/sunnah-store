import 'server-only';
import { db } from './db';
import { getSettings } from './catalog';
import type { Currency } from './money';

// Sales, costs and profit for a day, week, month or year, plus the same figures for the period before
// and a trend of the last 12 periods. Amounts are converted into one report currency with the admin rates.
export type Period = 'day' | 'week' | 'month' | 'year';
export const PERIODS: Period[] = ['day', 'week', 'month', 'year'];

// Boundaries are worked out on a clock shifted by the store's UTC offset, then shifted back.
const H = 3600e3;
function startOf(p: Period, t: number) {
  const d = new Date(t), y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate();
  if (p === 'day') return Date.UTC(y, m, day);
  if (p === 'week') return Date.UTC(y, m, day - ((d.getUTCDay() + 6) % 7));
  if (p === 'month') return Date.UTC(y, m, 1);
  return Date.UTC(y, 0, 1);
}
function step(p: Period, t: number, n: number) {
  const d = new Date(t), y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate();
  if (p === 'day') return Date.UTC(y, m, day + n);
  if (p === 'week') return Date.UTC(y, m, day + 7 * n);
  if (p === 'month') return Date.UTC(y, m + n, 1);
  return Date.UTC(y + n, 0, 1);
}
const sub: Record<Period, Period | 'hour'> = { day: 'hour', week: 'day', month: 'day', year: 'month' };
const label = (p: Period | 'hour', t: number) => {
  const d = new Date(t), o = { timeZone: 'UTC' } as const;
  if (p === 'hour') return `${d.getUTCHours()}:00`;
  if (p === 'day') return d.toLocaleDateString('en-GB', { ...o, day: 'numeric', month: 'short' });
  if (p === 'week') return 'Week of ' + d.toLocaleDateString('en-GB', { ...o, day: 'numeric', month: 'short', year: 'numeric' });
  if (p === 'month') return d.toLocaleDateString('en-GB', { ...o, month: 'short', year: 'numeric' });
  return String(d.getUTCFullYear());
};

const SOLD = ['paid', 'cod', 'refunded'];
type Totals = { orders: number; items: number; revenue: number; products: number; shipping: number; cogs: number; rewards: number; refunds: number; expenses: number; gross: number; net: number };
const zero = (): Totals => ({ orders: 0, items: 0, revenue: 0, products: 0, shipping: 0, cogs: 0, rewards: 0, refunds: 0, expenses: 0, gross: 0, net: 0 });
const finish = (t: Totals) => { t.gross = t.revenue - t.cogs; t.net = t.gross - t.rewards - t.refunds - t.expenses; return t; };

export async function report(p: Period, anchor: Date, cur: Currency, tz: number) {
  const { rates } = await getSettings();
  const to = (n: unknown, c: string) => (Number(n) / (rates[c as Currency] || 1)) * (rates[cur] || 1);
  const off = tz * H;
  const local = startOf(p, anchor.getTime() + off);
  const start = local - off, end = step(p, local, 1) - off, prev = step(p, local, -1) - off, trendFrom = step(p, local, -11) - off;

  const [orders, expenses, newCustomers, pending, products, ads, views, reviews] = await Promise.all([
    db.order.findMany({ where: { createdAt: { gte: new Date(Math.min(prev, trendFrom)), lt: new Date(end) } }, include: { lines: true } }),
    db.expense.findMany({ where: { date: { gte: new Date(Math.min(prev, trendFrom)), lt: new Date(end) } } }),
    db.customer.count({ where: { createdAt: { gte: new Date(start), lt: new Date(end) } } }),
    db.order.count({ where: { payStatus: 'pending', createdAt: { gte: new Date(start), lt: new Date(end) } } }),
    db.product.findMany({ orderBy: { sort: 'asc' }, select: { name: true, sub: true, kind: true, active: true, stock: true, priceCents: true, costCents: true } }),
    db.ad.findMany({ orderBy: { clicks: 'desc' }, select: { title: true, place: true, on: true, views: true, clicks: true } }),
    // Views are counted per UTC day, so the range is widened to whole days.
    db.productView.findMany({ where: { day: { gte: new Date(new Date(start).toISOString().slice(0, 10)), lt: new Date(end) } }, include: { product: { select: { name: true, sub: true, kind: true } } } }),
    db.review.findMany({ where: { createdAt: { gte: new Date(start), lt: new Date(end) } }, select: { stars: true, status: true, product: { select: { name: true, sub: true, kind: true } } } }),
  ]);

  const add = (t: Totals, o: (typeof orders)[number]) => {
    if (!SOLD.includes(o.payStatus)) return;
    t.orders++;
    t.revenue += to(o.total, o.currency); t.products += to(Number(o.subtotal) - Number(o.creditUsed), o.currency); t.shipping += to(o.shipping, o.currency);
    t.rewards += to(o.rewardEarned, o.currency);
    if (o.payStatus === 'refunded') t.refunds += to(o.total, o.currency);
    for (const l of o.lines) { t.items += l.qty; t.cogs += to(Number(l.cost) * l.qty, o.currency); }
  };
  const sum = (from: number, until: number) => {
    const t = zero();
    for (const o of orders) if (+o.createdAt >= from && +o.createdAt < until) add(t, o);
    for (const e of expenses) if (+e.date >= from && +e.date < until) t.expenses += to(e.amount, e.currency);
    return finish(t);
  };

  const now = sum(start, end), before = sum(prev, start);
  const growth = (k: keyof Totals) => (before[k] ? ((now[k] - before[k]) / Math.abs(before[k])) * 100 : null);

  // Bars inside the period: hours of a day, days of a week or month, months of a year.
  const bars: { label: string; revenue: number; net: number; orders: number }[] = [];
  const sp = sub[p];
  for (let t = local; t < step(p, local, 1); t = sp === 'hour' ? t + H : step(sp, t, 1)) {
    const next = sp === 'hour' ? t + H : step(sp, t, 1);
    const s = sum(t - off, next - off);
    bars.push({ label: label(sp, t), revenue: s.revenue, net: s.net, orders: s.orders });
  }
  const trend = Array.from({ length: 12 }, (_, i) => { const t = step(p, local, i - 11); return { label: label(p, t), ...sum(t - off, step(p, t, 1) - off) }; }).reverse();

  // Breakdowns for the selected period.
  const inRange = orders.filter(o => +o.createdAt >= start && +o.createdAt < end);
  const sold = inRange.filter(o => SOLD.includes(o.payStatus));
  const group = <K extends string>(key: (o: (typeof orders)[number]) => K) => {
    const m = new Map<K, { orders: number; revenue: number }>();
    for (const o of sold) { const k = key(o), v = m.get(k) || { orders: 0, revenue: 0 }; v.orders++; v.revenue += to(o.total, o.currency); m.set(k, v); }
    return [...m].map(([k, v]) => ({ k, ...v })).sort((a, b) => b.revenue - a.revenue);
  };
  const prod = new Map<string, { qty: number; revenue: number; cost: number }>();
  for (const o of sold) for (const l of o.lines) {
    const v = prod.get(l.name) || { qty: 0, revenue: 0, cost: 0 };
    v.qty += l.qty; v.revenue += to(Number(l.unit) * l.qty, o.currency); v.cost += to(Number(l.cost) * l.qty, o.currency); prod.set(l.name, v);
  }
  const exp = new Map<string, number>();
  for (const e of expenses) if (+e.date >= start && +e.date < end) exp.set(e.category, (exp.get(e.category) || 0) + to(e.amount, e.currency));
  const noCost = sold.some(o => o.lines.some(l => Number(l.cost) === 0));
  const status = { placed: inRange.length, delivered: sold.filter(o => o.status === 6).length, onTheWay: sold.filter(o => o.status > 0 && o.status < 6).length, notSent: sold.filter(o => o.status === 0).length, failed: inRange.filter(o => o.payStatus === 'failed').length, pending };

  return {
    title: label(p, local), start: new Date(start), end: new Date(end), now, before, growth, bars, trend, newCustomers, status, noCost,
    countries: group(o => o.country), sources: group(o => o.source || 'Direct'),
    stock: products.map(x => {
      const st = x.stock as Record<string, number>, n = { BD: Number(st.BD) || 0, MY: Number(st.MY) || 0, US: Number(st.US) || 0 }, all = n.BD + n.MY + n.US;
      return { name: x.name + (x.kind === 'pen' && x.sub ? ' · ' + x.sub : ''), active: x.active, ...n, all, value: to(all * x.costCents / 100, 'USD'), retail: to(all * x.priceCents / 100, 'USD') };
    }),
    ads,
    views: (() => {
      const m = new Map<string, { views: number; sold: number; good: number; bad: number }>();
      const get = (k: string) => m.get(k) || (m.set(k, { views: 0, sold: 0, good: 0, bad: 0 }), m.get(k)!);
      const nm = (x: { name: string; sub: string; kind: string }) => `${x.name}${x.kind === 'pen' ? ' · ' + x.sub : ''}`;
      for (const v of views) get(nm(v.product)).views += v.views;
      for (const o of sold) for (const l of o.lines) get(l.name).sold += l.qty;
      for (const r of reviews) { const x = get(nm(r.product)); if (r.stars >= 4) x.good++; else if (r.stars <= 2) x.bad++; }
      return [...m].map(([name, v]) => ({ name, ...v, rate: v.views ? (v.sold / v.views) * 100 : null })).sort((a, b) => b.views - a.views);
    })(),
    reviews: { all: reviews.length, good: reviews.filter(r => r.stars >= 4).length, mid: reviews.filter(r => r.stars === 3).length, bad: reviews.filter(r => r.stars <= 2).length,
      waiting: reviews.filter(r => r.status === 'pending').length, avg: reviews.length ? reviews.reduce((a, r) => a + r.stars, 0) / reviews.length : 0 }, methods: group(o => o.payMethod.replace(/^m-/, '').toUpperCase()), couriers: group(o => o.courier || 'Not set'),
    products: [...prod].map(([name, v]) => ({ name, ...v, profit: v.revenue - v.cost })).sort((a, b) => b.revenue - a.revenue),
    expenses: [...exp].map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v),
    orders: inRange.map(o => ({ no: o.no, source: o.source || 'Direct', at: o.createdAt, name: o.name, country: o.country, pay: o.payMethod, payStatus: o.payStatus, status: o.status, total: Number(o.total), currency: o.currency, inCur: to(o.total, o.currency) })),
  };
}
export type Report = Awaited<ReturnType<typeof report>>;
