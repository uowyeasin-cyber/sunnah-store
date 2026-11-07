import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { db } from './db';
import { key, loadKeys } from './keys';
import { getProduct, getProducts, getSettings } from './catalog';
import { formatPrice, isCurrency, unitCents, type Currency } from './money';
import { COUNTRIES, payMethodsFor, shippingFor } from './shipping';
import { DELIVERED, STEPS } from './tracking';
import { RETURN_DAYS, RETURN_REASONS } from './returns';
import { sendMail } from './mail';
import { roleOf } from './roles';

// The shop's AI assistant. It answers only from the tools below, which read the real catalog,
// shipping rules, policies and (with the order number and matching email) the customer's order.
export const MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'];
export const DAILY_LIMIT = 400; // assistant replies per day across the whole shop, to cap the bill
export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export async function assistantReady() {
  await loadKeys();
  return !!key('ANTHROPIC_API_KEY') && key('ASSISTANT_ON') !== 'off';
}

const site = () => process.env.SITE_URL || 'https://sunnahstore.vercel.app';

const TOOLS: Anthropic.Beta.BetaTool[] = [
  { name: 'search_products', description: 'Lists products in the shop with price (in the customer currency), offer, availability and link. Leave query empty to list everything.', strict: true,
    input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Words to match in name, finish, category or type; empty for all' } }, required: ['query'], additionalProperties: false } },
  { name: 'get_product', description: 'Full details and specifications of one product, by its slug from search_products.', strict: true,
    input_schema: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'], additionalProperties: false } },
  { name: 'shipping_info', description: 'Courier, delivery time, shipping cost and payment methods (including cash on delivery) for a destination country.', strict: true,
    input_schema: { type: 'object', properties: { country: { type: 'string', description: 'Country name in English, e.g. Malaysia' }, order_value_usd: { type: 'number', description: 'Value of the items in US dollars, 0 if unknown' } }, required: ['country', 'order_value_usd'], additionalProperties: false } },
  { name: 'order_status', description: 'Status, courier, tracking number and expected delivery of an order. Needs both the order number and the email used on the order.', strict: true,
    input_schema: { type: 'object', properties: { order_no: { type: 'string', description: 'e.g. PM-261107-12345' }, email: { type: 'string' } }, required: ['order_no', 'email'], additionalProperties: false } },
  { name: 'store_policies', description: 'Returns and refunds, store credit and rewards, pre-order, and how to contact the shop.', strict: true,
    input_schema: { type: 'object', properties: {}, required: [], additionalProperties: false } },
  { name: 'contact_human', description: 'Sends the conversation to the shop team by email so a person replies. Use when the customer asks for a person, has a complaint you cannot solve, or needs something the tools cannot answer.', strict: true,
    input_schema: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' }, summary: { type: 'string', description: 'What the customer needs, in a few sentences' } }, required: ['name', 'email', 'summary'], additionalProperties: false } },
];

type Ctx = { cur: Currency; transcript: string };

async function runTool(name: string, input: Record<string, unknown>, ctx: Ctx): Promise<string> {
  const s = await getSettings();
  const str = (k: string) => String(input[k] ?? '').trim();
  if (name === 'search_products' || name === 'get_product') {
    const all = await getProducts();
    const avail = s.preorder?.on ? `Pre-order: ${s.preorder.ships}` : 'Call get_product for stock';
    if (name === 'get_product') {
      const d = await getProduct(str('slug'));
      if (!d) return 'No product with that slug.';
      const left = Object.values(d.stock || {}).reduce((a, n) => a + Number(n || 0), 0);
      return JSON.stringify({ name: d.name, variant: d.sub, category: d.category.name, price: formatPrice(unitCents(d.priceCents, d.offer?.pct || 0), ctx.cur, s.rates), was: d.offer ? formatPrice(d.priceCents, ctx.cur, s.rates) : undefined,
        offer: d.offer?.label, availability: s.preorder?.on ? `Pre-order: ${s.preorder.ships}` : left > 0 ? 'In stock' : 'Out of stock', details: d.details, link: `${site()}/p/${d.slug}` });
    }
    const words = str('query').toLowerCase().split(/\s+/).filter(Boolean);
    const hit = all.filter(p => !words.length || words.some(w => `${p.name} ${p.sub} ${p.finish} ${p.kind} ${p.category.name}`.toLowerCase().includes(w)));
    return JSON.stringify((hit.length ? hit : all).slice(0, 20).map(p => ({ slug: p.slug, name: p.name, variant: p.sub, category: p.category.name, price: formatPrice(unitCents(p.priceCents, p.offer?.pct || 0), ctx.cur, s.rates), offer: p.offer?.label, availability: avail, link: `${site()}/p/${p.slug}` })));
  }
  if (name === 'shipping_info') {
    const c = COUNTRIES.find(x => x.toLowerCase() === str('country').toLowerCase());
    if (!c) return `We do not list that country. Countries we ship to: ${COUNTRIES.join(', ')}`;
    const sh = shippingFor(c, Math.round((Number(input.order_value_usd) || 0) * 100), s.regions);
    return JSON.stringify({ country: c, shipsFrom: sh.warehouse, courier: sh.courier, deliveryDays: `${sh.days[0]}–${sh.days[1]}`, shipping: formatPrice(sh.costCents, ctx.cur, s.rates), payMethods: payMethodsFor(c, s.regions), preorder: s.preorder?.on ? s.preorder.ships : undefined });
  }
  if (name === 'order_status') {
    const o = await db.order.findUnique({ where: { no: str('order_no').toUpperCase() }, include: { lines: true } });
    if (!o || o.email.toLowerCase() !== str('email').toLowerCase()) return 'No order matches that order number and email. Ask the customer to check both (the order number is in the receipt email).';
    return JSON.stringify({ order: o.no, status: STEPS[o.status] || 'Order placed', delivered: o.status >= DELIVERED, payment: o.payStatus, courier: o.courier, trackingNo: o.trackingNo || 'not booked yet',
      expected: o.etaFrom && o.etaTo ? `${o.etaFrom.toISOString().slice(0, 10)} to ${o.etaTo.toISOString().slice(0, 10)}` : undefined, preorder: o.preorder || undefined, items: o.lines.map(l => `${l.qty}× ${l.name}`), page: `${site()}/order/${o.id}` });
  }
  if (name === 'store_policies') {
    return JSON.stringify({ returns: `Within ${RETURN_DAYS} days of delivery, from the order page (Request a return). Reasons: ${RETURN_REASONS.join(', ')}. Approved refunds go to store credit.`,
      storeCredit: `Every delivered order earns ${s.rewardRate}% back as store credit, usable at checkout when signed in with the same email.`,
      preorder: s.preorder?.on ? `Everything currently sells as pre-order: ${s.preorder.ships}.` : 'Items ship from stock.',
      account: 'Sign in with a six-digit email code (no password) to see orders, tracking, returns and store credit.', track: `${site()}/track`, contact: 'Ask me to pass a message to the team.' });
  }
  if (name === 'contact_human') {
    const email = str('email');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Ask the customer for a valid email so the team can reply.';
    const owners = s.admins.filter(e => e && roleOf(e, s.roles) === 'owner');
    for (const to of owners) await sendMail(to, `Customer needs help: ${str('name') || email}`, `${str('summary')}\n\nReply to: ${email}\n\n--- Conversation ---\n${ctx.transcript}`.slice(0, 8000)).catch(e => console.error('handoff mail failed', e));
    return owners.length ? 'Sent to the team. They will reply by email.' : 'The team inbox is not set up; tell the customer to try again later.';
  }
  return 'Unknown tool';
}

// One counter row per day, so a runaway bot cannot run up the bill.
async function underDailyLimit() {
  const day = new Date().toISOString().slice(0, 10);
  const row = await db.setting.findUnique({ where: { key: 'assistantUsage' } });
  const v = (row?.value || {}) as { day?: string; n?: number };
  const n = v.day === day ? (v.n || 0) + 1 : 1;
  if (n > DAILY_LIMIT) return false;
  await db.setting.upsert({ where: { key: 'assistantUsage' }, update: { value: { day, n } }, create: { key: 'assistantUsage', value: { day, n } } });
  return true;
}

export async function chat(history: ChatTurn[], lang: string, cur: string): Promise<{ text: string; error?: string }> {
  if (!(await assistantReady())) return { text: '', error: 'off' };
  if (!(await underDailyLimit())) return { text: '', error: 'busy' };
  const s = await getSettings();
  const model = MODELS.includes(key('ASSISTANT_MODEL')) ? key('ASSISTANT_MODEL') : MODELS[0];
  const client = new Anthropic({ apiKey: key('ANTHROPIC_API_KEY') });
  const ctx: Ctx = { cur: isCurrency(cur) ? cur : 'USD', transcript: history.map(h => `${h.role === 'user' ? 'Customer' : 'Assistant'}: ${h.content}`).join('\n') };
  const system = `You are the shopping assistant of ${s.store.name}, an online shop: ${s.store.tagline}
Help customers choose products, and answer questions about products, prices, shipping, payment, orders, returns and store credit.
Rules:
- Facts come only from your tools. Never guess a price, stock level, delivery date, order status, policy or specification; if a tool does not say it, say you are not sure and offer to pass the question to the team (contact_human).
- For an order, ask for the order number and the email used on it, then call order_status.
- Prices are in the customer's currency as the tools give them. Share product links from the tools.
- Reply in the customer's language (site language code: ${lang}). Keep replies short and warm, plain text, no tables.
- You cannot place orders, change orders, issue refunds or take payment; send the customer to the right page or to the team.`;
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map(h => ({ role: h.role, content: h.content }));
  for (let i = 0; i < 6; i++) {
    const r = await client.beta.messages.create({
      model, max_tokens: 4000, system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }], tools: TOOLS, messages,
      output_config: { effort: 'low' },
      ...(model === 'claude-haiku-5-5' ? {} : { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }),
    });
    if (r.stop_reason === 'refusal') return { text: 'Sorry, I can’t help with that here. I can pass your question to our team if you like.' };
    if (r.stop_reason !== 'tool_use') return { text: r.content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join('\n').trim() || 'Sorry, could you say that another way?' };
    messages.push({ role: 'assistant', content: r.content });
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const b of r.content) if (b.type === 'tool_use') {
      const out = await runTool(b.name, (b.input || {}) as Record<string, unknown>, ctx).catch(e => { console.error('assistant tool failed', b.name, e); return null; });
      results.push(out === null ? { type: 'tool_result', tool_use_id: b.id, content: 'This tool failed. Tell the customer you could not check right now.', is_error: true } : { type: 'tool_result', tool_use_id: b.id, content: out });
    }
    messages.push({ role: 'user', content: results });
  }
  return { text: 'Sorry, that took too long. Please try again, or ask me to pass it to our team.' };
}
