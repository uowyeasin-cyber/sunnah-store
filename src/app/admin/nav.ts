import type { Area } from '@/lib/roles';

// The admin sidebar. Each item opens one area; `also` lists areas shown as tabs inside the same item.
export type Item = { area: Area; label: string; icon: string; also?: [Area, string][] };
export const NAV: { title: string; items: Item[] }[] = [
  { title: 'Overview', items: [
    { area: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { area: 'decisions', label: "Today's decisions", icon: 'inbox' },
    { area: 'reminders', label: 'Reminders & schedule', icon: 'clock' },
    { area: 'ai', label: 'AI co-worker', icon: 'sparkle' },
  ] },
  { title: 'Sell', items: [
    { area: 'orders', label: 'Orders', icon: 'receipt' },
    { area: 'returns', label: 'Returns', icon: 'undo' },
    { area: 'products', label: 'Products', icon: 'box' },
    { area: 'channels', label: 'Sales channels', icon: 'globe' },
    { area: 'categories', label: 'Categories', icon: 'folder' },
    { area: 'offers', label: 'Offers & coupons', icon: 'tag' },
    { area: 'reviews', label: 'Reviews & loyalty', icon: 'star', also: [['loyalty', 'Loyalty points']] },
  ] },
  { title: 'Source', items: [
    { area: 'sourcing', label: 'Global sourcing', icon: 'globe' },
    { area: 'suppliers', label: 'Suppliers', icon: 'factory' },
  ] },
  { title: 'Customers', items: [
    { area: 'customers', label: 'Customers', icon: 'users' },
    { area: 'chats', label: 'Customer chats', icon: 'chat' },
  ] },
  { title: 'Grow', items: [
    { area: 'reports', label: 'Profit & loss', icon: 'chart', also: [['ledger', 'Money ledger'], ['expenses', 'Expenses']] },
    { area: 'social', label: 'Marketing & SEO', icon: 'megaphone', also: [['seo', 'SEO & ads'], ['marketing', 'Email marketing'], ['ads', 'Advertisements']] },
    { area: 'aitools', label: 'AI tools & chatbot', icon: 'bot' },
    { area: 'automation', label: 'Automation', icon: 'bolt' },
  ] },
  { title: 'Settings', items: [
    { area: 'settings', label: 'Store & theme', icon: 'palette', also: [['homepage', 'Home page'], ['menu', 'Menu bar']] },
    { area: 'payments', label: 'Payments & languages', icon: 'map', also: [['languages', 'Languages'], ['connections', 'Connections (keys)']] },
    { area: 'team', label: 'Admins', icon: 'key' },
    { area: 'licenses', label: 'App licenses', icon: 'coins' },
    { area: 'activity', label: 'Activity history', icon: 'list' },
  ] },
];

// First tab label of a grouped item (the item's own page).
export const FIRST: Partial<Record<Area, string>> = { reports: 'Profit & loss', social: 'Social media', settings: 'Design & settings', payments: 'Payments', reviews: 'Reviews' };

export const ICONS: Record<string, string> = {
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  inbox: 'M4 13l2-8h12l2 8M4 13v6h16v-6M4 13h5l1 2h4l1-2h5',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h4',
  undo: 'M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3',
  box: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9',
  folder: 'M3 6h6l2 2h10v11H3z',
  tag: 'M3 12V4h8l10 10-8 8zM7.5 8.5h.01',
  star: 'M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9z',
  chat: 'M4 5h16v11H9l-5 4z',
  factory: 'M3 21V10l5 3V10l5 3V7l8 4v10zM7 17h2M12 17h2M17 17h2',
  users: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21a7 7 0 0114 0M17 11a3 3 0 100-6M22 21a6 6 0 00-4-5.6',
  chart: 'M4 4v16h16M8 16v-4M12 16V8M16 16v-6',
  megaphone: 'M3 10v4h4l7 4V6L7 10zM18 9a4 4 0 010 6',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  palette: 'M12 3a9 9 0 100 18c1.5 0 2-1 2-2 0-1.5-1-2-1-3s1-2 2.5-2H18a3 3 0 003-3c0-4.4-4-8-9-8zM7.5 11h.01M10 7h.01M15 7h.01',
  map: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14',
  globe: 'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z',
  key: 'M15 7a4 4 0 11-3.5 6L4 20.5V17h3v-3h3l1.5-1.5A4 4 0 0115 7z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-5-5',
  bot: 'M5 9h14v10H5zM12 5v4M9 13h.01M15 13h.01M3 13v3M21 13v3',
  store: 'M4 9l1-5h14l1 5M4 9v11h16V9M4 9h16M9 20v-6h6v6',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  coins: 'M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3zM4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
};
