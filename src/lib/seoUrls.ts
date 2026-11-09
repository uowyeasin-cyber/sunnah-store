import { LANGS, type Lang } from './i18n';

// Public address of the shop, without a trailing slash.
export const siteUrl = () => (process.env.SITE_URL || 'https://sunnahstore.vercel.app').replace(/\/+$/, '');

// English lives at the plain URL (/p/x); other languages at /bn/p/x, /ar/p/x, /hi/p/x.
export const langPath = (lang: Lang, path: string) => {
  const p = path === '/' ? '' : path;
  return lang === 'en' ? p || '/' : `/${lang}${p}`;
};

// Canonical + hreflang links for one page, so Google shows each language to the right searchers
// and never counts the language copies as duplicates.
export function alternates(lang: Lang, path: string) {
  const languages: Record<string, string> = Object.fromEntries(Object.keys(LANGS).map(l => [l, siteUrl() + langPath(l as Lang, path)]));
  languages['x-default'] = siteUrl() + langPath('en', path);
  return { canonical: siteUrl() + langPath(lang, path), languages };
}

export const OG_LOCALE: Record<Lang, string> = { en: 'en_US', bn: 'bn_BD', ar: 'ar_AR', hi: 'hi_IN' };

// Safe JSON for a <script type="application/ld+json"> tag.
export const ldJson = (x: unknown) => JSON.stringify(x).replace(/</g, '\\u003c');
