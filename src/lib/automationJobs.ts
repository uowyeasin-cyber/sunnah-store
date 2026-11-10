// The automation jobs and their settings. No server code here so admin pages and actions can share it.
export type Mode = 'off' | 'approve' | 'auto';
export const JOBS = [
  { id: 'courier', name: 'Courier booking', does: 'Books the courier for paid and cash-on-delivery orders as soon as they come in, and retries ones that failed (up to 3 times each).', modes: ['off', 'approve', 'auto'] as Mode[], def: 'auto' as Mode },
  { id: 'dropship', name: 'Dropship orders (auto sourcing)', does: 'When a customer pays for a dropship product, an order goes to its supplier (CJ Dropshipping, or by email) to ship straight to the customer, with no invoice or prices inside. The supplier tracking number goes on the customer order, and CJ cost and stock are kept current. Automatic spends from your CJ balance; Ask me first waits for your OK on each one.', modes: ['off', 'approve', 'auto'] as Mode[], def: 'approve' as Mode },
  { id: 'channels', name: 'Sales channels sync', does: 'For every linked marketplace shop (Daraz, Lazada): sends our stock and prices to the listings with the same SKU, and brings their new orders into Orders, so stock is shared and nothing oversells.', modes: ['off', 'auto'] as Mode[], def: 'auto' as Mode },
  { id: 'tracking', name: 'Tracking updates', does: 'Checks the courier for every open order once a day and moves it forward. Customers get an email at each step.', modes: ['off', 'auto'] as Mode[], def: 'auto' as Mode },
  { id: 'lowStock', name: 'Low-stock alert', does: 'Emails the owners when a product is at or under the low-stock level in any warehouse.', modes: ['off', 'auto'] as Mode[], def: 'off' as Mode },
  { id: 'abandonedBag', name: 'Abandoned bag reminder', does: 'One email, a day after someone typed their email at checkout and did not order, with a link that puts the same items back in their bag.', modes: ['off', 'auto'] as Mode[], def: 'off' as Mode },
  { id: 'releaseUnpaid', name: 'Release unpaid stock', does: 'Online-payment orders still unpaid after 48 hours are cancelled and their units go back on the shelf. Bank or wallet orders waiting for you to check the transaction ID are left alone.', modes: ['off', 'auto'] as Mode[], def: 'off' as Mode },
  { id: 'dailySummary', name: 'Daily summary email', does: "Emails the owners yesterday's orders and sales, and what is waiting for them.", modes: ['off', 'auto'] as Mode[], def: 'off' as Mode },
  { id: 'reviews', name: 'AI review check', does: 'New customer reviews are read by the AI: real ones go live by themselves, spam and abuse are hidden. Off: they wait for you in Reviews.', modes: ['off', 'auto'] as Mode[], def: 'off' as Mode },
  { id: 'aiDaily', name: 'AI co-worker daily check', does: 'Every day the AI looks at sales, stock and offers and fixes what it can: a flash sale on slow products, a coupon, hiding sold-out items, better product text. Ask me first shows its plan in AI co-worker.', modes: ['off', 'approve', 'auto'] as Mode[], def: 'off' as Mode },
  { id: 'aiSeo', name: 'AI SEO', does: 'Writes Google titles and descriptions for new products that have none yet.', modes: ['off', 'auto'] as Mode[], def: 'off' as Mode },
  { id: 'aiSourcing', name: 'AI sourcing', does: 'Once a week the AI updates the world best-sellers list in Sourcing, finds suppliers with websites and market shops without one (Google Maps, phone, email) for the top products and saves them in Suppliers, and can import the closest CJ products as hidden drafts. It never buys anything. Choose what it does in Sourcing → AI sourcing on autopilot.', modes: ['off', 'auto'] as Mode[], def: 'auto' as Mode },
  { id: 'aiWeekly', name: 'Weekly AI business report', does: 'Every Monday the AI emails the owners what went well, what did not, and the 5 best next steps.', modes: ['off', 'auto'] as Mode[], def: 'off' as Mode },
] as const;
export type JobId = (typeof JOBS)[number]['id'];
export type Automation = { full: boolean; master: boolean; stopped: boolean; stoppedBy: string; stoppedAt: string; lowStockAt: number; jobs: Record<JobId, { mode: Mode; paused: boolean }> };
export const MODE_LABEL: Record<Mode, string> = { off: 'Off', approve: 'Ask me first', auto: 'Automatic' };

export const defaultAutomation = (): Automation => ({
  full: false, master: true, stopped: false, stoppedBy: '', stoppedAt: '', lowStockAt: 5,
  jobs: Object.fromEntries(JOBS.map(j => [j.id, { mode: j.def, paused: false }])) as Automation['jobs'],
});
