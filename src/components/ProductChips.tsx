'use client';
import { useState } from 'react';
import { useStore } from './StoreProvider';

// Filter the home product grid by collection without leaving the page.
export default function ProductChips({ cats, target }: { cats: { slug: string; name: string; n: number }[]; target: string }) {
  const { t } = useStore();
  const [on, setOn] = useState('all');
  if (cats.length < 2) return null;
  const pick = (slug: string) => {
    setOn(slug);
    document.querySelectorAll<HTMLElement>(`#${target} [data-cat]`).forEach(el => { el.hidden = slug !== 'all' && el.dataset.cat !== slug; });
  };
  return <div className="chips" role="tablist" aria-label={t('Collections')}>
    {[{ slug: 'all', name: t('All'), n: cats.reduce((a, c) => a + c.n, 0) }, ...cats].map(c => <button key={c.slug} type="button" role="tab" aria-selected={on === c.slug} className={on === c.slug ? 'on' : ''} onClick={() => pick(c.slug)}>{c.name}<small>{c.n}</small></button>)}
  </div>;
}
