'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [['/admin/orders', 'Orders'], ['/admin/products', 'Products & offers'], ['/admin/categories', 'Categories'], ['/admin/homepage', 'Homepage slides'], ['/admin/menu', 'Menu bar'], ['/admin/ads', 'Advertisements'], ['/admin/payments', 'Payments'], ['/admin/reviews', 'Reviews'], ['/admin/languages', 'Languages'], ['/admin/settings', 'Design & settings'], ['/admin/team', 'Admin team']];

export default function AdminNav() {
  const path = usePathname();
  return <nav className="side">{TABS.map(([h, l]) => <Link key={h} href={h} className={path.startsWith(h) ? 'on' : ''}>{l}</Link>)}</nav>;
}
