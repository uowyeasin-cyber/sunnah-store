import { notFound } from 'next/navigation';
import { getAds, getCategories, getProducts, getSettings } from '@/lib/catalog';
import ProductCard from '@/components/ProductCard';
import { AdSlot } from '@/components/Ads';

export async function generateStaticParams() {
  return (await getCategories()).map(c => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<'/c/[slug]'>) {
  const { slug } = await params;
  return { title: (await getCategories()).find(c => c.slug === slug)?.name };
}

export default async function CategoryPage({ params }: PageProps<'/c/[slug]'>) {
  const { slug } = await params;
  const [cats, products, ads, s] = await Promise.all([getCategories(), getProducts(), getAds(), getSettings()]);
  const cat = cats.find(c => c.slug === slug);
  if (!cat) notFound();
  const list = products.filter(p => p.category.slug === slug);
  return (
    <div className="view"><section className="wrap">
      <div className="sec-head"><div><div className="kicker">Collection</div><h2>{cat.name}</h2><p className="muted" style={{ marginTop: 8 }}>{list.length} {list.length === 1 ? 'product' : 'products'}</p></div></div>
      <AdSlot ads={ads} place="category" products={products} brand={s.store.name} wrap={false} />
      {list.length ? <div className="grid">{list.map(p => <ProductCard key={p.id} p={p} brand={s.store.name} />)}</div> : <p className="empty">New pieces are coming to this collection soon.</p>}
    </section></div>
  );
}
