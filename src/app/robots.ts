import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const site = process.env.SITE_URL || 'https://sunnahstore.vercel.app';
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/checkout', '/order/', '/account', '/go/'] }], sitemap: `${site}/sitemap.xml` };
}
