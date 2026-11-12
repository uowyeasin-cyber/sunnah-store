// Sale campaigns (like 11.11) and Share & earn. Plain data shared by the shop, checkout and admin; no server-only code here.

// A social or chat link shown on a campaign, e.g. "Join our WhatsApp group".
export type JoinLink = { label: string; url: string };
// Where a campaign shows: a thin bar at the top, a big banner on the home page, a strip on product pages, a pop-up.
export type SalePlace = 'bar' | 'home' | 'product' | 'popup';
export const SALE_PLACES: [SalePlace, string][] = [['bar', 'Thin bar at the top of every page'], ['home', 'Big banner on the home page'], ['product', 'Strip on every product page'], ['popup', 'Pop-up once per visit']];
export type SaleLook = 'red' | 'gold' | 'dark' | 'green' | 'purple';
export const SALE_LOOKS: [SaleLook, string][] = [['red', 'Red and white (11.11 style)'], ['gold', 'Gold'], ['dark', 'Dark'], ['green', 'Green'], ['purple', 'Purple']];

export type SaleEvent = {
  id: string; on: boolean; name: string;
  kicker: string; title: string; text: string;
  startsAt: string; endsAt: string; // ISO times; before the start a "starts in" countdown shows when teaser is on
  teaser: boolean;
  pct: number; // percent off every product in the campaign (0 = no automatic discount)
  cats: string[]; // collection slugs the discount covers; empty = whole shop
  code: string; // optional coupon code to show on the banner
  cta: string; link: string; // button text and where it goes (path or https URL)
  image: string; look: SaleLook;
  places: SalePlace[];
  share: boolean; shareText: string; // show share buttons so people spread the campaign
  join: JoinLink[]; // WhatsApp, Messenger, Facebook, Telegram… links that bring people to you
};

export const newSale = (): SaleEvent => {
  const y = new Date().getFullYear();
  return { id: Math.random().toString(36).slice(2, 10), on: false, name: '11.11 Mega Sale', kicker: '11.11 Mega Sale', title: 'Up to 20% off everything',
    text: 'One day only. Share with friends and family.', startsAt: `${y}-11-11T00:00`, endsAt: `${y}-11-11T23:59`, teaser: true, pct: 0, cats: [], code: '',
    cta: 'Shop the sale', link: '/shop', image: '', look: 'red', places: ['bar', 'home', 'product'], share: true, shareText: '', join: [] };
};

const ms = (s: string) => { const t = Date.parse(s); return Number.isFinite(t) ? t : NaN; };
// The campaign showing now: a live one first, else (when teased) the next one about to start.
export function currentSale(list: SaleEvent[] | undefined, now: number): { ev: SaleEvent; phase: 'live' | 'soon'; until: number } | null {
  const on = (list || []).filter(e => e.on);
  const live = on.find(e => !(ms(e.startsAt) > now) && !(ms(e.endsAt) <= now));
  if (live) return { ev: live, phase: 'live', until: ms(live.endsAt) };
  const soon = on.filter(e => e.teaser && ms(e.startsAt) > now).sort((a, b) => ms(a.startsAt) - ms(b.startsAt))[0];
  return soon ? { ev: soon, phase: 'soon', until: ms(soon.startsAt) } : null;
}
// Percent off one product from the live campaign (0 when none applies).
export function salePct(list: SaleEvent[] | undefined, cats: string[], now: number) {
  const c = currentSale(list, now);
  if (!c || c.phase !== 'live' || !c.ev.pct) return 0;
  return !c.ev.cats.length || c.ev.cats.some(x => cats.includes(x)) ? Math.min(90, Math.max(0, c.ev.pct)) : 0;
}

// Share & earn: a signed-in shopper shares a link; when a friend buys through it, the sharer gets store credit.
export type ShareCfg = {
  on: boolean; // referral rewards on/off
  rewardPct: number; // credit for the sharer, % of what the friend paid for items
  maxReward: number; // most credit per order in USD (0 = no limit)
  friendPct: number; // discount for the friend who opens a shared link (0 = none)
  unlock: boolean; // share-to-unlock discount on/off
  unlockPct: number; // discount after the shopper shares a product
  text: string; // line shown above the share buttons
};
export const SHARE_DEFAULT: ShareCfg = { on: false, rewardPct: 5, maxReward: 0, friendPct: 0, unlock: false, unlockPct: 5, text: '' };
export const shareCfg = (v: Partial<ShareCfg> | undefined): ShareCfg => ({ ...SHARE_DEFAULT, ...(v || {}) });
