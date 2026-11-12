// Admin roles. Each role opens some admin areas (the part after /admin/). Owners open everything.
export const AREAS = ['dashboard', 'decisions', 'reports', 'orders', 'returns', 'products', 'categories', 'homepage', 'menu', 'social', 'ads', 'payments', 'connections', 'expenses', 'reviews', 'languages', 'settings', 'team', 'activity', 'automation', 'ledger', 'suppliers', 'marketing', 'customers', 'loyalty', 'offers', 'chats', 'aitools', 'ai', 'seo', 'reminders', 'sourcing', 'licenses', 'channels', 'earn', 'templates'] as const;
export type Area = (typeof AREAS)[number];

export const ROLES = {
  owner: { label: 'Owner: everything, including team, keys and activity log', areas: AREAS as readonly Area[] },
  manager: { label: 'Manager: everything except team, keys and activity log', areas: AREAS.filter(a => !['team', 'connections', 'activity', 'licenses'].includes(a)) },
  orders: { label: 'Orders and support: orders, returns, reviews, customers, chats', areas: ['decisions', 'orders', 'returns', 'reviews', 'customers', 'chats'] as Area[] },
  content: { label: 'Content: products, homepage, menu, ads, social, reviews, languages', areas: ['products', 'offers', 'categories', 'homepage', 'menu', 'ads', 'social', 'marketing', 'seo', 'reviews', 'languages'] as Area[] },
  viewer: { label: 'Reports only (read)', areas: ['dashboard', 'reports'] as Area[] },
} as const;
export type Role = keyof typeof ROLES;

export const isRole = (r: unknown): r is Role => typeof r === 'string' && r in ROLES;
// Admins saved before roles existed have no role yet and stay owners.
export const roleOf = (email: string, roles: Record<string, string> | undefined): Role => { const r = roles?.[email.toLowerCase()]; return isRole(r) ? r : 'owner'; };
export const canUse = (role: Role, area: Area) => (ROLES[role].areas as readonly Area[]).includes(area);

export const alertsOn = (email: string, off: string[] | undefined) => !(off || []).includes(email.toLowerCase());
// Who gets store alert emails (seller wanted, reminders, daily summary, stock): owners whose switch is on.
export const alertEmails = (s: { admins: string[]; roles: Record<string, string>; alertsOff?: string[] }) =>
  s.admins.filter(e => e && roleOf(e, s.roles) === 'owner' && alertsOn(e, s.alertsOff));
