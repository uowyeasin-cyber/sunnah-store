import { getSettings } from '@/lib/catalog';
import { getLicenses } from '@/lib/licenses';

export const metadata = { title: 'Get this store for your business' };

// Public download page for the store app sold to other businesses. The demo rules come from Admin → App licenses.
export default async function GetApp() {
  const [s, l] = await Promise.all([getSettings(), getLicenses()]);
  return <div className="wrap view help">
    <div className="kicker">For businesses</div>
    <h1>Get this store <em>for your business</em></h1>
    <section className="panel">
      <p>Everything you see on {s.store.name}, the shop and the full admin panel, can run as your own online store.</p>
      <ul>
        <li>Download the app and install it on your own free Vercel account with the step-by-step guide inside.</li>
        <li>Try it free: {l.opens} demo session{l.opens === 1 ? '' : 's'} within {l.days} day{l.days === 1 ? '' : 's'}.</li>
        <li>After the demo, contact us for a license to keep using it.</li>
        <li>Pick a ready-made look in one click: online shop, fashion, beauty, doctor & clinic, pharmacy, grocery, restaurant, gadgets, sale campaign, Islamic lifestyle, books & courses, home & decor.</li>
      </ul>
      {(l.prices.monthly || l.prices.yearly || l.prices.lifetime) && <><h3>Plans</h3><ul>
        {l.prices.monthly && <li>Monthly: {l.prices.monthly}</li>}
        {l.prices.yearly && <li>Yearly: {l.prices.yearly}</li>}
        {l.prices.lifetime && <li>Lifetime: {l.prices.lifetime}</li>}
      </ul></>}
      {l.contact && <p>To buy a license: {l.contact}</p>}
      <p><a className="btn" href={l.download} download>Download the app</a></p>
    </section>
  </div>;
}
