import 'server-only';
import { createHash } from 'node:crypto';
import { LANGS, type Lang } from './i18n';
import { langPath, siteUrl } from './seoUrls';

// IndexNow tells Bing, Yandex, Seznam and Naver about new or changed pages within minutes,
// instead of waiting for their next crawl. Google reads the sitemap instead.
export const indexNowKey = () => process.env.INDEXNOW_KEY || createHash('sha256').update('indexnow:' + siteUrl()).digest('hex').slice(0, 32);

// Every language copy of each path.
export const allLangs = (paths: string[]) => paths.flatMap(p => Object.keys(LANGS).map(l => siteUrl() + langPath(l as Lang, p)));

export async function pingIndexNow(urls: string[]): Promise<{ ok: boolean; status: number }> {
  if (!urls.length || /localhost|127\.0\.0\.1/.test(siteUrl())) return { ok: false, status: 0 };
  try {
    const r = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ host: new URL(siteUrl()).host, key: indexNowKey(), keyLocation: `${siteUrl()}/api/indexnow`, urlList: urls.slice(0, 10000) }),
    });
    return { ok: r.status === 200 || r.status === 202, status: r.status };
  } catch { return { ok: false, status: 0 }; }
}
