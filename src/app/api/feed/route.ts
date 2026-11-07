import { NextRequest } from 'next/server';
import { getProduct, getProducts, getSettings } from '@/lib/catalog';
import { convert, isCurrency, unitCents } from '@/lib/money';

// Product feed for Google Merchant Center (free listings and Shopping ads) and Meta Commerce (Facebook and Instagram Shops).
// One feed per currency: /api/feed?cur=USD, ?cur=MYR, ?cur=BDT. Both platforms read this RSS format.
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = (s: string) => s.replace(/[#*_`>]/g, '').replace(/\s+/g, ' ').trim();

export async function GET(req: NextRequest) {
  const site = process.env.SITE_URL || 'https://sunnahstore.vercel.app';
  const c = req.nextUrl.searchParams.get('cur')?.toUpperCase();
  const cur = isCurrency(c) ? c : 'USD';
  const [s, list] = await Promise.all([getSettings(), getProducts()]);
  const weeks = Number(s.preorder?.ships?.match(/(\d+)\s*[–-]?\s*(\d+)?\s*week/i)?.[2] || s.preorder?.ships?.match(/(\d+)\s*week/i)?.[1] || 6);
  const preDate = new Date(Date.now() + weeks * 7 * 864e5).toISOString().slice(0, 10) + 'T00:00Z';
  const items = await Promise.all(list.map(async p => {
    const d = await getProduct(p.slug);
    const left = Object.values(d?.stock || {}).reduce((a, n) => a + Number(n || 0), 0);
    const avail = s.preorder?.on ? 'preorder' : left > 0 ? 'in_stock' : 'out_of_stock';
    const price = convert(p.priceCents, cur, s.rates), sale = p.offer ? convert(unitCents(p.priceCents, p.offer.pct), cur, s.rates) : 0;
    const img = (u: string) => (u.startsWith('http') ? u : `${site}${u}`);
    return `<item>
<g:id>${esc(p.slug)}</g:id>
<g:title>${esc(`${p.name}${p.sub ? ' – ' + p.sub : ''}`.slice(0, 150))}</g:title>
<g:description>${esc(strip(d?.details || p.sub || p.name).slice(0, 4900))}</g:description>
<g:link>${site}/p/${esc(p.slug)}</g:link>
${p.image ? `<g:image_link>${esc(img(p.image))}</g:image_link>` : ''}${p.images.slice(1, 10).map(u => `<g:additional_image_link>${esc(img(u))}</g:additional_image_link>`).join('')}
<g:availability>${avail}</g:availability>${avail === 'preorder' ? `<g:availability_date>${preDate}</g:availability_date>` : ''}
<g:price>${price.toFixed(2)} ${cur}</g:price>${sale && sale < price ? `<g:sale_price>${sale.toFixed(2)} ${cur}</g:sale_price>` : ''}
<g:condition>new</g:condition>
<g:brand>${esc(s.store.name)}</g:brand>
<g:identifier_exists>no</g:identifier_exists>
<g:product_type>${esc(p.category.name)}</g:product_type>
</item>`;
  }));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>
<title>${esc(s.store.name)}</title><link>${site}</link><description>${esc(s.store.tagline)}</description>
${items.join('\n')}
</channel></rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
