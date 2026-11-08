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
      </ul>
      <p><a className="btn" href={l.download} download>Download the app</a></p>
    </section>
  </div>;
}
