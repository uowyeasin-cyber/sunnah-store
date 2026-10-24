import type { Currency } from './money';
import type { Region, Settings } from './settings';

// Which warehouse ships to a country, the default courier, cost (USD cents) and delivery days.
// Steadfast is booked automatically (lib/fulfil); other couriers are booked by hand and tracked through Ship24.
export const COUNTRIES = [
  'Bangladesh', 'Malaysia', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Oman', 'Bahrain',
  'India', 'Pakistan', 'Indonesia', 'Singapore', 'Brunei', 'Turkey', 'Germany', 'France', 'Netherlands', 'Italy', 'Spain', 'Sweden', 'Ireland', 'South Africa', 'Nigeria', 'Egypt', 'Other',
];

export type Ship = { warehouse: 'BD' | 'MY' | 'US'; courier: string; costCents: number; days: [number, number]; currency: Currency };

// The admin picks each region's courier and whether it takes cash on delivery (Admin → Connections).
export const REGIONS: { id: Region; name: string; couriers: string[] }[] = [
  { id: 'BD', name: 'Bangladesh', couriers: ['Steadfast Courier', 'Pathao Courier', 'RedX', 'Paperfly', 'eCourier', 'Sundarban Courier', 'SA Paribahan'] },
  { id: 'MY', name: 'Malaysia', couriers: ['J&T Express', 'Pos Laju', 'Ninja Van', 'GDex', 'City-Link Express', 'DHL eCommerce', 'Shopee Xpress'] },
  { id: 'US', name: 'United States', couriers: ['USPS', 'UPS', 'FedEx', 'DHL Express'] },
  { id: 'INTL', name: 'Other countries', couriers: ['DHL Express', 'FedEx', 'Aramex', 'UPS', 'EMS (Pos Malaysia)'] },
];
export const regionOf = (country: string): Region => (country === 'Bangladesh' ? 'BD' : country === 'Malaysia' ? 'MY' : country === 'United States' ? 'US' : 'INTL');
type Regions = Settings['regions'];

export function shippingFor(country: string, subtotalUsdCents: number, regions?: Regions): Ship {
  const s = shipBase(country, subtotalUsdCents);
  const pick = regions?.[regionOf(country)]?.courier;
  return pick ? { ...s, courier: pick } : s;
}
function shipBase(country: string, subtotalUsdCents: number): Ship {
  if (country === 'Bangladesh') return { warehouse: 'BD', courier: 'Steadfast Courier', costCents: subtotalUsdCents >= 2500 ? 0 : 100, days: [1, 3], currency: 'BDT' };
  if (country === 'Malaysia') return { warehouse: 'MY', courier: 'J&T Express', costCents: subtotalUsdCents >= 4000 ? 0 : 200, days: [2, 4], currency: 'MYR' };
  if (country === 'United States') return { warehouse: 'US', courier: 'USPS', costCents: subtotalUsdCents >= 7500 ? 0 : 600, days: [2, 5], currency: 'USD' };
  const near = ['Singapore', 'Brunei', 'Indonesia', 'Australia'].includes(country);
  return { warehouse: near ? 'MY' : country === 'Canada' ? 'US' : 'MY', courier: 'DHL Express', costCents: subtotalUsdCents >= 15000 ? 0 : 1800, days: [4, 8], currency: 'USD' };
}

// Pay-at-door and online methods shown at checkout, by country. Each shows once its gateway is connected.
export function payMethodsFor(country: string, regions?: Regions) {
  const cod = { id: 'cod', label: 'Cash on delivery', note: 'Pay the courier when it arrives' };
  return byCountry(country, cod).filter(m => m.id !== 'cod' || (regions?.[regionOf(country)]?.cod ?? true));
}
function byCountry(country: string, cod: { id: string; label: string; note: string }) {
  const card = { id: 'card', label: 'Card', note: 'Visa, Mastercard, Amex, Apple Pay, Google Pay' }, paypal = { id: 'paypal', label: 'PayPal', note: 'PayPal balance or card' };
  if (country === 'Bangladesh') return [cod, { id: 'bkash', label: 'bKash', note: 'Mobile wallet' }, { id: 'nagad', label: 'Nagad', note: 'Mobile wallet' }, { id: 'rocket', label: 'Rocket', note: 'Mobile wallet' }, { id: 'sslcommerz', label: 'Card or bank', note: 'Visa, Mastercard, Amex, internet banking (SSLCommerz)' }];
  if (country === 'Malaysia') return [cod, { id: 'tng', label: "Touch 'n Go eWallet", note: 'eWallet' }, { id: 'fpx', label: 'Online banking (FPX)', note: 'All Malaysian banks' }, { id: 'grabpay', label: 'GrabPay', note: 'eWallet' }, card, paypal];
  if (country === 'United States') return [cod, card, paypal, { id: 'cashapp', label: 'Cash App Pay', note: 'Pay with Cash App' }];
  return [cod, card, paypal];
}
