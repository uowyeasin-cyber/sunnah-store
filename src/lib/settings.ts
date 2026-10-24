import type { Rates } from './money';

// Everything an admin can change without touching code. Stored in the Setting table, one row per key.
export type NavItem = { label: string; to: string; show: boolean }; // to: "all", "cat:<slug>", "track" or a path
export type Slide = { id: string; eyebrow: string; title: string; italic: string; text: string; product: string; cta: string; look: 'light' | 'dark'; image: string; video: string };

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
  popupDelay: number;
  rewardRate: number; // percent of order total given back as store credit
  rates: Rates; // 1 USD in each currency
  admins: string[]; // up to five emails that open the admin panel
  holdReviews: boolean;
  allowVideoReviews: boolean;
  manualPay: ManualPay[];
  warehouses: Record<'BD' | 'MY' | 'US', Sender>; // ship-from addresses used when booking couriers
  parcel: { kgPerItem: number; cm: [number, number, number] }; // default parcel for courier booking
  regions: Record<Region, { courier: string; cod: boolean }>; // courier and cash on delivery per region, see lib/shipping
  preorder: { on: boolean; ships: string }; // everything sells as pre-order, with when it ships
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
  popupDelay: 5,
  rewardRate: 0.5,
  rates: { USD: 1, MYR: 4.7, BDT: 120 },
  admins: ['', '', '', '', ''],
  holdReviews: true,
  allowVideoReviews: true,
  preorder: { on: true, ships: 'Ships in 4–6 weeks' },
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
  noir: { label: 'Noir', swatch: '#0f0e0d', dark: true, vars: { '--bg': '#0f0e0d', '--surface': '#171614', '--cloth': '#1f1d1a', '--ink': '#f1ece3', '--muted': '#a39b8e', '--line': '#2e2b27', '--accent': '#d3b57c', '--accent-ink': '#121110', '--solid': '#f1ece3', '--solid-ink': '#121110', '--glass': 'rgba(15,14,13,.86)' } },
};
export const DISPLAY_FONTS: Record<string, string> = { 'Cormorant Garamond': "'Cormorant Garamond',Georgia,serif", 'Bodoni Moda': "'Bodoni Moda',Didot,Georgia,serif", Marcellus: "'Marcellus',Georgia,serif" };
export const BODY_FONTS: Record<string, string> = { Jost: "'Jost',system-ui,sans-serif", Manrope: "'Manrope',system-ui,sans-serif" };

// CSS variables for the chosen theme, applied on <html> by the root layout.
export function themeStyle(t: Settings['theme']): Record<string, string> {
  const vars: Record<string, string> = { ...(PRESETS[t.preset]?.vars || {}) };
  if (t.accent) vars['--accent'] = t.accent;
  vars['--display'] = DISPLAY_FONTS[t.font] || DISPLAY_FONTS['Cormorant Garamond'];
  vars['--body'] = BODY_FONTS[t.body] || BODY_FONTS.Jost;
  vars['--radius'] = t.radius + 'px';
  return vars;
}
