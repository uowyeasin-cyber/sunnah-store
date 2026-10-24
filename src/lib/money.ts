// Prices are stored in US cents. Other currencies are converted with the admin-set rates.
export const CURRENCIES = {
  USD: { symbol: '$', decimals: 2, label: 'USD $' },
  MYR: { symbol: 'RM ', decimals: 2, label: 'MYR RM' },
  BDT: { symbol: '৳', decimals: 0, label: 'BDT ৳' },
} as const;
export type Currency = keyof typeof CURRENCIES;
export type Rates = Record<Currency, number>;

export const isCurrency = (c: unknown): c is Currency => typeof c === 'string' && c in CURRENCIES;

export function convert(usdCents: number, cur: Currency, rates: Rates) {
  const v = (usdCents / 100) * (rates[cur] || 1);
  const d = CURRENCIES[cur].decimals;
  return Math.round(v * 10 ** d) / 10 ** d;
}

export function formatAmount(amount: number, cur: Currency) {
  const { symbol, decimals } = CURRENCIES[cur];
  return symbol + amount.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export const formatPrice = (usdCents: number, cur: Currency, rates: Rates) => formatAmount(convert(usdCents, cur, rates), cur);

// Offer price for a product, in US cents.
export const unitCents = (priceCents: number, pct: number) => (pct ? Math.round(priceCents * (1 - pct / 100)) : priceCents);
