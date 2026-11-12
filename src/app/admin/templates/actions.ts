'use server';
import { updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { nav, slides, TEMPLATES } from '@/lib/siteTemplates';
import { getSettings } from '@/lib/catalog';

const put = (key: string, value: object) => db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });

// One click: the whole site takes the chosen template's look, texts, menu and home page.
export async function applyTemplate(fd: FormData) {
  const t = TEMPLATES.find(x => x.id === String(fd.get('id')));
  if (!t) return;
  await requireAdmin('templates', 'applyTemplate', t.id);
  const s = await getSettings();
  const keepName = !!fd.get('keepName');
  await put('theme', t.theme);
  await put('store', { ...t.store, name: keepName ? s.store.name : t.store.name, mono: keepName ? s.store.mono : t.store.mono, logo: s.store.logo });
  await put('nav', nav(t));
  await put('slides', slides(t));
  await put('film', { ...s.film, on: false });
  await put('preorder', { ...s.preorder, on: !!t.preorder });
  // Old products are archived, never deleted: Products → Archived brings them back.
  if (fd.get('hideOld')) await db.product.updateMany({ where: { archived: false }, data: { archived: true, active: false } });
  if (fd.get('samples')) {
    for (const [i, [slug, name]] of t.cats.entries()) await db.category.upsert({ where: { slug }, update: { name, sort: i }, create: { slug, name, sort: i } });
    const cats = await db.category.findMany({ where: { slug: { in: t.cats.map(c => c[0]) } } });
    for (const [i, p] of t.products.entries()) {
      const slug = `${t.id}-${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
      const categoryId = cats.find(c => c.slug === p.cat)!.id;
      await db.product.upsert({ where: { slug }, update: { archived: false, active: true },
        create: { slug, name: p.name, sub: p.sub, priceCents: Math.round(p.usd * 100), kind: p.kind, images: [], categoryId, sort: i, stock: { BD: 20, MY: 0, US: 0 } } });
    }
  }
  updateTag('catalog');
  redirect('/admin/templates?applied=' + t.id);
}
