'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [['/admin/reports', 'Reports'], ['/admin/orders', 'Orders'], ['/admin/returns', 'Returns'], ['/admin/automation', 'Automation'], ['/admin/products', 'Products & offers'], ['/admin/categories', 'Categories'], ['/admin/suppliers', 'Suppliers & stock'], ['/admin/homepage', 'Homepage slides'], ['/admin/menu', 'Menu bar'], ['/admin/social', 'Social media'], ['/admin/marketing', 'Email marketing'], ['/admin/ads', 'Advertisements'], ['/admin/payments', 'Payments'], ['/admin/connections', 'Connections'], ['/admin/ledger', 'Money ledger'], ['/admin/expenses', 'Expenses'], ['/admin/reviews', 'Reviews'], ['/admin/languages', 'Languages'], ['/admin/settings', 'Design & settings'], ['/admin/team', 'Admin team'], ['/admin/activity', 'Activity log']];

export default function AdminNav({ areas }: { areas: string[] }) {
  const path = usePathname();
  return <nav className="side">{TABS.filter(([h]) => areas.includes(h.split('/')[2])).map(([h, l]) => <Link key={h} href={h} className={path.startsWith(h) ? 'on' : ''}>{l}</Link>)}</nav>;
}
