import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

// Sample catalogue so a fresh database looks like the approved prototype. Safe to re-run.
async function main() {
  const cats = [['miswak-pens', 'Miswak pens'], ['miswak-sticks', 'Miswak sticks'], ['attar-oils', 'Attar & oils'], ['gift-sets', 'Gift sets'], ['accessories', 'Accessories']];
  const ids: Record<string, string> = {};
  for (const [i, [slug, name]] of cats.entries()) ids[slug] = (await db.category.upsert({ where: { slug }, update: {}, create: { slug, name, sort: i } })).id;
  const products = [
    { slug: 'pocket-pen-champagne', name: 'Pocket Pen', sub: 'Brushed champagne', kind: 'pen', finish: 'alu', swatch: 'linear-gradient(#f3eee3,#a39884)', priceCents: 5900, cat: 'miswak-pens', offer: { label: 'Launch −15%', pct: 15, style: 'ribbon' } },
    { slug: 'pocket-pen-graphite', name: 'Pocket Pen', sub: 'Graphite', kind: 'pen', finish: 'alug', swatch: 'linear-gradient(#8c8d91,#1e1e1f)', priceCents: 5900, cat: 'miswak-pens' },
    { slug: 'pocket-pen-brass', name: 'Pocket Pen', sub: 'Solid brass, limited', kind: 'pen', finish: 'brassb', swatch: 'linear-gradient(#f6e2a9,#6e4f22)', priceCents: 8900, cat: 'miswak-pens', offer: { label: 'Only 120 made', pct: 0, style: 'pill' } },
    { slug: 'peelu-sticks', name: 'Peelu sticks', sub: '10 sticks, 8 mm, sealed', kind: 'sticks', priceCents: 1200, cat: 'miswak-sticks', offer: { label: 'Buy 2 get 1', pct: 0, style: 'stamp' } },
    { slug: 'peelu-sticks-family', name: 'Peelu sticks, family pack', sub: '30 sticks, mixed 6–10 mm', kind: 'sticks', priceCents: 2900, cat: 'miswak-sticks' },
    { slug: 'perfume-oils', name: 'Perfume oils', sub: 'Oud, white musk, amber · 2 ml each', kind: 'oil', priceCents: 1400, cat: 'attar-oils' },
    { slug: 'amber-oud-attar', name: 'Amber oud attar', sub: '6 ml bottle, alcohol free', kind: 'attar', priceCents: 2400, cat: 'attar-oils' },
    { slug: 'leather-pocket-sleeve', name: 'Leather pocket sleeve', sub: 'Full-grain leather, fits one pen', kind: 'sleeve', priceCents: 1900, cat: 'accessories' },
    { slug: 'gift-set', name: 'Gift set', sub: 'Pen, 10 sticks, 3 oils, keepsake box', kind: 'gift', priceCents: 9900, cat: 'gift-sets', offer: { label: 'Eid gift −10%', pct: 10, style: 'timer' } },
  ];
  for (const [i, { cat, offer, ...p }] of products.entries()) {
    const row = await db.product.upsert({ where: { slug: p.slug }, update: {}, create: { ...p, sort: i, categoryId: ids[cat], stock: { US: 40, MY: 20, BD: 60 } } });
    if (offer) await db.offer.upsert({ where: { productId: row.id }, update: {}, create: { ...offer, productId: row.id, endsAt: offer.style === 'timer' ? new Date(Date.now() + 3 * 864e5) : null } });
  }
  if (!(await db.ad.count())) {
    await db.ad.createMany({ data: [
      { on: true, place: 'ticker', title: 'Free tracked delivery over $75', sort: 0 },
      { on: true, place: 'ticker', title: 'Eid gift set now 10% off', link: 'gift-set', sort: 1 },
      { on: true, place: 'home-mid', kicker: 'Eid edit', title: 'The gift set, now 10% off', text: 'A pen, ten peelu sticks, three perfume oils and a keepsake box. Wrapped and ready to give.', cta: 'Shop the gift set', link: 'gift-set', style: 'dark' },
      { on: true, place: 'product', kicker: 'Complete the ritual', title: 'Amber oud attar', text: 'Alcohol free, 6 ml. Rolls on like the oil in the pen cap.', cta: 'Discover', link: 'amber-oud-attar', style: 'gold' },
      { on: true, place: 'popup', kicker: 'For first orders', title: 'A gift with your first pen', text: 'Ten peelu sticks, free with any Pocket Pen this week.', cta: 'Shop the pens', link: 'cat:miswak-pens', style: 'light' },
    ] });
  }
  if (!(await db.review.count())) {
    const pen = await db.product.findUniqueOrThrow({ where: { slug: 'pocket-pen-champagne' } });
    await db.review.createMany({ data: [
      { productId: pen.id, name: 'Omar K.', place: 'Houston, USA', stars: 5, text: 'Sits flat in my thobe pocket. I trimmed a 140 mm stick to 110 and it closes with room to spare.', status: 'live', verified: true },
      { productId: pen.id, name: 'Aisha R.', place: 'London, UK', stars: 5, text: 'Bought it for my father. The oil roller on the cap is the detail he shows everyone.', status: 'live', verified: true },
      { productId: pen.id, name: 'Imran H.', place: 'Dhaka, Bangladesh', stars: 4, text: 'Looks sharp. Takes a day to get used to the twist collar.', status: 'live', verified: true },
    ] });
  }
  const owner = process.env.SEED_ADMIN_EMAIL;
  if (owner) await db.setting.upsert({ where: { key: 'admins' }, update: {}, create: { key: 'admins', value: [owner, '', '', '', ''] } });
}
main().finally(() => db.$disconnect());
