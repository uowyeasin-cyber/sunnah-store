import { getEarn, liveUnits, unitHtml } from '@/lib/earn';
import NetAd from './NetAd';

// Ad network units for one place on the page. Nothing renders while the network switch is off.
export default async function NetAds({ place, wrap = true }: { place: string; wrap?: boolean }) {
  const e = await getEarn();
  const units = liveUnits(e, place);
  if (!units.length) return null;
  return <div className={wrap ? 'wrap net-slot' : 'net-slot'}>{units.map(u => <NetAd key={u.id} html={unitHtml(e, u)} hideFor={e.net.hideFor} />)}</div>;
}

// Site-wide scripts: AdSense loader (with Auto ads when ticked) and units placed on "head".
export async function NetHead() {
  const e = await getEarn();
  if (!e.net.on) return null;
  const parts: string[] = [];
  const usesAdsense = e.net.client && (e.net.autoAds || e.net.units.some(u => u.on && u.provider === 'adsense'));
  if (usesAdsense) parts.push(`<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${e.net.client.replace(/[^\w-]/g, '')}" crossorigin="anonymous"></script>`);
  for (const u of liveUnits(e, 'head')) parts.push(unitHtml(e, u));
  if (!parts.length) return null;
  return <NetAd html={parts.join('\n')} hideFor={e.net.hideFor} />;
}
