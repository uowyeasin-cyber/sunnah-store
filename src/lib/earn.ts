import { cacheLife, cacheTag } from 'next/cache';
import { db } from './db';

// "Earn money" settings: ad networks (AdSense and others), ad short links, and the "Advertise with us" page.
// One Setting row "earn". Every part has its own on/off switch in Admin → Earn money.

export const NET_PLACES: [string, string][] = [
  ['head', 'Whole site (auto ads / pop-under / anchor scripts, loaded once per page)'],
  ['home-top', 'Homepage, under the collections'],
  ['home-mid', 'Homepage, before best sellers'],
  ['category', 'Top of category pages'],
  ['product', 'Product pages'],
  ['footer', 'Above the footer (every shop page)'],
  ['shortlink', 'Short link wait page'],
];

// Kinds of ads the owner can allow or block. A unit of a blocked kind never shows.
export const AD_TYPES: [string, string][] = [
  ['banner', 'Display banner'],
  ['native', 'Native / in-feed (looks like content)'],
  ['auto', 'Auto ads (network places them)'],
  ['anchor', 'Sticky anchor bar'],
  ['video', 'Video ads'],
  ['interstitial', 'Full-screen / vignette'],
  ['popunder', 'Pop-under / new tab'],
];

export const PROVIDERS: [string, string, string][] = [
  ['adsense', 'Google AdSense', 'https://adsense.google.com/start/'],
  ['adsterra', 'Adsterra', 'https://adsterra.com/'],
  ['monetag', 'Monetag', 'https://monetag.com/'],
  ['medianet', 'Media.net', 'https://www.media.net/'],
  ['ezoic', 'Ezoic', 'https://www.ezoic.com/'],
  ['propeller', 'PropellerAds', 'https://propellerads.com/'],
  ['amazon', 'Amazon Associates (affiliate banners)', 'https://affiliate-program.amazon.com/'],
  ['custom', 'Any other network (paste its code)', ''],
];

export type NetUnit = { id: string; on: boolean; name: string; provider: string; type: string; place: string; slot: string; code: string };
export type Earn = {
  net: { on: boolean; client: string; autoAds: boolean; types: string[]; adsTxt: string; units: NetUnit[]; hideFor: string[] };
  links: { on: boolean; wait: number; houseAd: boolean; note: string };
  advertise: { on: boolean; title: string; text: string; prices: string; whatsapp: string; email: string };
};

export const DEFAULT_EARN: Earn = {
  net: { on: false, client: '', autoAds: false, types: ['banner', 'native', 'auto', 'anchor'], adsTxt: '', units: [], hideFor: ['/checkout', '/bag', '/account', '/order'] },
  links: { on: false, wait: 5, houseAd: true, note: 'Your link is almost ready.' },
  advertise: { on: false, title: 'Advertise with us', text: 'Put your brand in front of our shoppers in Bangladesh, Malaysia and the USA: homepage banners, product page spots, the moving strip and sponsored posts.', prices: 'Homepage banner, 7 days | 1500 BDT\nProduct page spot, 7 days | 1000 BDT\nMoving strip, 7 days | 700 BDT\nSponsored social post | 1200 BDT', whatsapp: '', email: '' },
};

const merge = (v: Partial<Earn>): Earn => ({
  net: { ...DEFAULT_EARN.net, ...v.net }, links: { ...DEFAULT_EARN.links, ...v.links }, advertise: { ...DEFAULT_EARN.advertise, ...v.advertise },
});

// Uncached, for admin.
export async function readEarn(): Promise<Earn> {
  const row = await db.setting.findUnique({ where: { key: 'earn' } }).catch(() => null);
  return merge((row?.value || {}) as Partial<Earn>);
}
export async function saveEarn(e: Earn) {
  await db.setting.upsert({ where: { key: 'earn' }, update: { value: e as object }, create: { key: 'earn', value: e as object } });
}

// Cached, for the shop. Admin saves call updateTag('catalog').
export async function getEarn(): Promise<Earn> {
  'use cache';
  cacheTag('catalog');
  cacheLife('days');
  return readEarn();
}

// Units that may show in a place right now: network on, unit on, its ad kind allowed.
export const liveUnits = (e: Earn, place: string) => e.net.on ? e.net.units.filter(u => u.on && u.place === place && e.net.types.includes(u.type)) : [];

// AdSense slot → the standard <ins> tag; any other network → the code the owner pasted.
export function unitHtml(e: Earn, u: NetUnit) {
  if (u.provider === 'adsense' && u.slot && e.net.client) {
    const fmt = u.type === 'native' ? 'data-ad-format="fluid" data-ad-layout="in-article"' : 'data-ad-format="auto" data-full-width-responsive="true"';
    return `<ins class="adsbygoogle" style="display:block" data-ad-client="${esc(e.net.client)}" data-ad-slot="${esc(u.slot)}" ${fmt}></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script>`;
  }
  return u.code;
}
const esc = (s: string) => s.replace(/[^\w-]/g, '');

export const shortCode = () => Math.random().toString(36).slice(2, 8);
