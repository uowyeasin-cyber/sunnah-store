import type { MetadataRoute } from 'next';
import { LANGS } from '@/lib/i18n';
import { siteUrl } from '@/lib/seoUrls';

// Private pages stay out of search, in every language copy (/bn/checkout etc.).
const PRIVATE = ['/checkout', '/order/', '/account', '/bag', '/track'];
export default function robots(): MetadataRoute.Robots {
  const langs = Object.keys(LANGS);
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/go/', ...PRIVATE, ...langs.flatMap(l => PRIVATE.map(p => `/${l}${p}`))] }],
    sitemap: `${siteUrl()}/sitemap.xml`, host: siteUrl(),
  };
}
