'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [['/admin/products', 'Products & offers'], ['/admin/categories', 'Categories'], ['/admin/homepage', 'Homepage slides'], ['/admin/menu', 'Menu bar'], ['/admin/ads', 'Advertisements'], ['/admin/reviews', 'Reviews'], ['/admin/settings', 'Design & settings'], ['/admin/team', 'Admin team']];

export default function AdminNav() {
  const path = usePathname();
  return <nav className="side">{TABS.map(([h, l]) => <Link key={h} href={h} className={path.startsWith(h) ? 'on' : ''}>{l}</Link>)}</nav>;
}
