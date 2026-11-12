import type { Rates } from './money';

// Everything an admin can change without touching code. Stored in the Setting table, one row per key.
export type NavItem = { label: string; to: string; show: boolean }; // to: "all", "cat:<slug>", "track" or a path
// One item at the top of the home page. Media can be any file: a photo, video, sound, or a document to open.
// cta is the old single button, kept only so older saved slides still show it (see heroSlides).
export type HeroButton = { label: string; href: string };
export type Fit = 'cover' | 'contain' | 'top';
export const FITS: [Fit, string][] = [['cover', 'Fill the space (edges may be cut)'], ['contain', 'Show all of it (no cutting)'], ['top', 'Fill, keep the top in view']];
export type Slide = { id: string; eyebrow: string; title: string; italic: string; text: string; product: string; cta: string; look: 'light' | 'dark'; image: string; video: string; motion?: Motion;
  audio?: string; file?: string; fileName?: string; poster?: string; videoTall?: string; fit?: Fit; buttons?: HeroButton[];
  layout?: 'card' | 'full'; size?: number }; // card: text left, picture in a card on the right, size = card width %
// Photos default to the card look; videos fill the width.
export const layoutOf = (sl: Slide) => sl.layout || (sl.video ? 'full' : 'card');
// How a showcase slide moves in: fade, slide in from the side, slow zoom, slow pan across, or rise up.
export type Motion = 'fade' | 'slide' | 'zoom' | 'pan' | 'rise';
export const MOTIONS: [Motion, string][] = [['fade', 'Fade'], ['slide', 'Slide in from the side'], ['zoom', 'Slow zoom'], ['pan', 'Slow pan across'], ['rise', 'Rise up']];
// How the collection icons move: gently float, scroll by on their own, pop in, or stay still.
export type CatStyle = 'float' | 'marquee' | 'pop' | 'still';
export const CAT_STYLES: [CatStyle, string][] = [['float', 'Gently float'], ['marquee', 'Scroll by on their own'], ['pop', 'Pop in one by one'], ['still', 'Stay still']];

// Pay-by-hand methods: the customer sends money to these details and types the transaction ID.
export type Sender = { name: string; phone: string; email: string; street: string; city: string; state: string; zip: string };
export type Region = 'BD' | 'MY' | 'US' | 'INTL';
export type ManualPay = { id: string; label: string; details: string; where: string; on: boolean };

export type Settings = {
  store: { name: string; mono: string; announce: string; tagline: string; logo: string };
  theme: { preset: string; accent: string; font: string; body: string; radius: number };
  nav: NavItem[];
  slides: Slide[];
  slideSecs: number;
  heroHeight: number; // height of the top section, % of the screen height (0 = automatic)
  catStyle: CatStyle;
  popupDelay: number;
  rewardRate: number; // percent of order total given back as store credit
  rates: Rates; // 1 USD in each currency
  admins: string[]; // up to ten emails that open the admin panel
  roles: Record<string, string>; // admin email → role (lib/roles); missing means owner
  alertsOff: string[]; // admin emails whose store alert emails are switched off (lib/roles alertEmails)
  holdReviews: boolean;
  allowVideoReviews: boolean;
  manualPay: ManualPay[];
  warehouses: Record<'BD' | 'MY' | 'US', Sender>; // ship-from addresses used when booking couriers
  parcel: { kgPerItem: number; cm: [number, number, number] }; // default parcel for courier booking
  regions: Record<Region, { courier: string; cod: boolean }>; // courier and cash on delivery per region, see lib/shipping
  preorder: { on: boolean; ships: string }; // everything sells as pre-order, with when it ships
  film: { on: boolean; wide: string; tall: string; poster: string; cta: string }; // launch film at the top of the home page; tall is for phones
  translations: Partial<Record<'en' | 'bn' | 'ar' | 'hi', Record<string, string>>>; // admin's own, see lib/i18n
};

export const DEFAULT_SETTINGS: Settings = {
  store: { name: 'Pen Miswak', mono: 'PM', announce: 'Tracked delivery worldwide from the USA, Malaysia and Bangladesh', tagline: 'Miswak and perfume oil, in one pen.', logo: '' },
  theme: { preset: 'porcelain', accent: '', font: 'Cormorant Garamond', body: 'Jost', radius: 2 },
  nav: [
    { label: 'Shop all', to: 'all', show: true },
    { label: 'Miswak pens', to: 'cat:miswak-pens', show: true },
    { label: 'Miswak sticks', to: 'cat:miswak-sticks', show: true },
    { label: 'Attar & oils', to: 'cat:attar-oils', show: true },
    { label: 'Gift sets', to: 'cat:gift-sets', show: true },
    { label: 'Accessories', to: 'cat:accessories', show: true },
    { label: 'Track order', to: 'track', show: true },
  ],
  slides: [
    { id: 's1', eyebrow: 'The chest-pocket pen', title: 'Miswak and perfume oil,', italic: 'in one pen.', text: 'Thick enough for a real stick. Thin enough that a shirt pocket still lies flat. Brushed aluminium, solid brass, sealed in two chambers.', product: 'pocket-pen-champagne', cta: 'Shop now', look: 'light', image: '', video: '' },
    { id: 's2', eyebrow: 'Miswak sticks', title: 'Peelu sticks,', italic: 'cut fresh.', text: 'Ten sealed sticks, 8 mm, trimmed to fit the pen.', product: 'peelu-sticks', cta: 'Discover', look: 'dark', image: '', video: '' },
    { id: 's3', eyebrow: 'Attar & oils', title: 'Amber oud attar', italic: '', text: 'Alcohol free, 6 ml. Rolls on like the oil in the pen cap.', product: 'amber-oud-attar', cta: 'Discover', look: 'light', image: '', video: '' },
  ],
  slideSecs: 6.5,
  heroHeight: 0,
  catStyle: 'float',
  popupDelay: 5,
  rewardRate: 0.5,
  rates: { USD: 1, MYR: 4.7, BDT: 120 },
  admins: ['', '', '', '', ''],
  roles: {},
  alertsOff: [],
  holdReviews: true,
  allowVideoReviews: true,
  preorder: { on: true, ships: 'Ships in 4–6 weeks' },
  film: { on: true, wide: '/media/film/launch-16x9.mp4', tall: '/media/film/launch-4x5.mp4', poster: '/media/film/launch-16x9.jpg', cta: 'Pre-order now' },
  translations: {},
  warehouses: { BD: { name: '', phone: '', email: '', street: '', city: '', state: '', zip: '' }, MY: { name: '', phone: '', email: '', street: '', city: '', state: '', zip: '' }, US: { name: '', phone: '', email: '', street: '', city: '', state: '', zip: '' } },
  parcel: { kgPerItem: 0.2, cm: [20, 12, 6] },
  regions: { BD: { courier: 'Steadfast Courier', cod: true }, MY: { courier: 'J&T Express', cod: true }, US: { courier: 'USPS', cod: true }, INTL: { courier: 'DHL Express', cod: true } },
  manualPay: [
    { id: 'bkash', label: 'bKash (Send Money)', details: '', where: 'Bangladesh', on: false },
    { id: 'nagad', label: 'Nagad (Send Money)', details: '', where: 'Bangladesh', on: false },
    { id: 'rocket', label: 'Rocket', details: '', where: 'Bangladesh', on: false },
    { id: 'bank-bd', label: 'Bank transfer', details: '', where: 'Bangladesh', on: false },
    { id: 'tng', label: "Touch 'n Go eWallet", details: '', where: 'Malaysia', on: false },
    { id: 'bank-my', label: 'Bank transfer (DuitNow)', details: '', where: 'Malaysia', on: false },
    { id: 'zelle', label: 'Zelle', details: '', where: 'United States', on: false },
    { id: 'paypal', label: 'PayPal', details: '', where: 'all', on: false },
  ],
};

export const PRESETS: Record<string, { label: string; swatch: string; vars: Record<string, string> | null; dark?: boolean }> = {
  porcelain: { label: 'Porcelain', swatch: '#f7f5f0', vars: null },
  cream: { label: 'Ivory', swatch: '#f4efe4', vars: { '--bg': '#f6f1e7', '--surface': '#fdfaf3', '--cloth': '#ece4d5', '--line': '#e2d8c6', '--glass': 'rgba(246,241,231,.9)' } },
  white: { label: 'Pure white', swatch: '#ffffff', vars: { '--bg': '#ffffff', '--surface': '#ffffff', '--cloth': '#f3f2ef', '--line': '#e6e4df', '--glass': 'rgba(255,255,255,.92)' } },
  stone: { label: 'Stone', swatch: '#eceae5', vars: { '--bg': '#eceae5', '--surface': '#f7f6f3', '--cloth': '#dedad2', '--line': '#d6d1c7', '--glass': 'rgba(236,234,229,.82)' } },
  sandalwood: { label: 'Sandalwood', swatch: '#efe4d2', vars: { '--bg': '#f3eadb', '--surface': '#fbf6ec', '--cloth': '#e8dbc5', '--line': '#dccdb3', '--ink': '#2a1e14', '--muted': '#76685a', '--accent': '#8a5f2c', '--glass': 'rgba(243,234,219,.88)' } },
  emerald: { label: 'Emerald night', swatch: '#0f2a22', dark: true, vars: { '--bg': '#0e211b', '--surface': '#132b23', '--cloth': '#18332a', '--ink': '#efe9dc', '--muted': '#a6b0a5', '--line': '#24443a', '--accent': '#d6b878', '--accent-ink': '#0e211b', '--solid': '#efe9dc', '--solid-ink': '#0e211b', '--night': '#081510', '--night-2': '#10261e', '--glass': 'rgba(14,33,27,.86)' } },
  oud: { label: 'Oud', swatch: '#1d1611', dark: true, vars: { '--bg': '#18120d', '--surface': '#211912', '--cloth': '#2a2018', '--ink': '#f2e9dc', '--muted': '#b0a291', '--line': '#3a2d22', '--accent': '#d9b77a', '--accent-ink': '#18120d', '--solid': '#f2e9dc', '--solid-ink': '#18120d', '--glass': 'rgba(24,18,13,.86)' } },
  clinic: { label: 'Clinic blue', swatch: '#eaf2fb', vars: { '--bg': '#f4f8fc', '--surface': '#ffffff', '--cloth': '#e6eef8', '--line': '#d6e2ef', '--ink': '#10233a', '--muted': '#5b6b7e', '--accent': '#1f6fd1', '--accent-ink': '#ffffff', '--solid': '#10233a', '--solid-ink': '#ffffff', '--glass': 'rgba(244,248,252,.92)' } },
  mint: { label: 'Fresh mint', swatch: '#e8f5ee', vars: { '--bg': '#f3faf6', '--surface': '#ffffff', '--cloth': '#e2f1e8', '--line': '#cfe5d8', '--ink': '#13261c', '--muted': '#5a6e62', '--accent': '#1f8a4c', '--accent-ink': '#ffffff', '--solid': '#13261c', '--solid-ink': '#ffffff', '--glass': 'rgba(243,250,246,.92)' } },
  blush: { label: 'Blush', swatch: '#fbe9ec', vars: { '--bg': '#fdf5f6', '--surface': '#ffffff', '--cloth': '#f8e5e9', '--line': '#efd5db', '--ink': '#2b1a1f', '--muted': '#7a6268', '--accent': '#c2456b', '--accent-ink': '#ffffff', '--solid': '#2b1a1f', '--solid-ink': '#ffffff', '--glass': 'rgba(253,245,246,.92)' } },
  sunshine: { label: 'Big sale', swatch: '#ffd23f', vars: { '--bg': '#fffaf0', '--surface': '#ffffff', '--cloth': '#fff1c9', '--line': '#f3dfa6', '--ink': '#1d1405', '--muted': '#6d5d3c', '--accent': '#e2361f', '--accent-ink': '#ffffff', '--solid': '#1d1405', '--solid-ink': '#ffd23f', '--glass': 'rgba(255,250,240,.92)' } },
  terracotta: { label: 'Terracotta', swatch: '#f3e1d6', vars: { '--bg': '#faf2ec', '--surface': '#fffaf6', '--cloth': '#f1e1d5', '--line': '#e6cfbf', '--ink': '#2a1810', '--muted': '#7b6153', '--accent': '#c0532d', '--accent-ink': '#ffffff', '--solid': '#2a1810', '--solid-ink': '#faf2ec', '--glass': 'rgba(250,242,236,.92)' } },
  slate: { label: 'Tech slate', swatch: '#0f172a', dark: true, vars: { '--bg': '#0d1424', '--surface': '#141d31', '--cloth': '#1a253c', '--ink': '#e8eefb', '--muted': '#97a3bb', '--line': '#26324c', '--accent': '#38bdf8', '--accent-ink': '#0d1424', '--solid': '#e8eefb', '--solid-ink': '#0d1424', '--night': '#080d18', '--night-2': '#111a2c', '--glass': 'rgba(13,20,36,.88)' } },
  noir: { label: 'Noir', swatch: '#0f0e0d', dark: true, vars: { '--bg': '#0f0e0d', '--surface': '#171614', '--cloth': '#1f1d1a', '--ink': '#f1ece3', '--muted': '#a39b8e', '--line': '#2e2b27', '--accent': '#d3b57c', '--accent-ink': '#121110', '--solid': '#f1ece3', '--solid-ink': '#121110', '--glass': 'rgba(15,14,13,.86)' } },
};
export const DISPLAY_FONTS: Record<string, string> = { 'Cormorant Garamond': "'Cormorant Garamond',Georgia,serif", 'Bodoni Moda': "'Bodoni Moda',Didot,Georgia,serif", Marcellus: "'Marcellus',Georgia,serif", 'Playfair Display': "'Playfair Display',Georgia,serif", Poppins: "'Poppins',system-ui,sans-serif" };
export const BODY_FONTS: Record<string, string> = { Jost: "'Jost',system-ui,sans-serif", Manrope: "'Manrope',system-ui,sans-serif", Inter: "'Inter',system-ui,sans-serif", Poppins: "'Poppins',system-ui,sans-serif" };

// CSS variables for the chosen theme, applied on <html> by the root layout.
export function themeStyle(t: Settings['theme']): Record<string, string> {
  const vars: Record<string, string> = { ...(PRESETS[t.preset]?.vars || {}) };
  if (t.accent) vars['--accent'] = t.accent;
  vars['--display'] = DISPLAY_FONTS[t.font] || DISPLAY_FONTS['Cormorant Garamond'];
  vars['--body'] = BODY_FONTS[t.body] || BODY_FONTS.Jost;
  vars['--radius'] = t.radius + 'px';
  return vars;
}

// The top of the home page as one list. Older stores kept the launch film apart and gave each slide one
// button (cta): both are folded in here, so nothing the owner made disappears. Saving the list stores
// the result, and the film is then turned off as a separate thing.
export function heroSlides(s: Pick<Settings, 'slides' | 'film'>): Slide[] {
  const list = s.slides.map(sl => sl.buttons ? sl : { ...sl, buttons: sl.cta ? [{ label: sl.cta, href: sl.product ? `/p/${sl.product}` : '/shop' }] : [] });
  const f = s.film, d = DEFAULT_SETTINGS.film;
  if (f.on && (f.wide || f.tall) && !list.some(x => x.id === 'film')) {
    // A wide film the owner uploaded replaces the built-in phone and cover versions too.
    const own = f.wide !== d.wide;
    list.unshift({ id: 'film', eyebrow: '', title: '', italic: '', text: '', product: '', cta: '', look: 'dark', image: '', video: f.wide || f.tall, motion: 'fade',
      videoTall: own && f.tall === d.tall ? '' : f.tall, poster: own && f.poster === d.poster ? '' : f.poster, fit: 'cover', buttons: f.cta ? [{ label: f.cta, href: '/shop' }] : [] });
  }
  return list;
}
