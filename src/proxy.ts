import { NextResponse, type NextRequest } from 'next/server';
import { isLang, LANGS } from '@/lib/i18n';

// Shop URLs stay plain (/shop, /p/…); the visitor's language picks which /[lang] page serves them.
// The choice comes from the language menu (pm-lang cookie), else the browser's language.
export function proxy(req: NextRequest) {
  const res = route(req);
  // Remember the visitor's country (from Vercel's IP lookup) so checkout can pre-select it.
  const cc = req.headers.get('x-vercel-ip-country');
  if (cc && /^[A-Z]{2}$/.test(cc) && req.cookies.get('pm-cc')?.value !== cc) res.cookies.set('pm-cc', cc, { path: '/', maxAge: 2592000, sameSite: 'lax' });
  if (!req.cookies.get('pm-src')) res.cookies.set('pm-src', sourceOf(req), { path: '/', maxAge: 2592000, sameSite: 'lax' });
  return res;
}

// First place a visitor came from, for Reports → Sources: an ?utm_source tag wins, else the referring site.
const SITES: [RegExp, string][] = [[/facebook|fb\.|fbclid/, 'Facebook'], [/instagram/, 'Instagram'], [/google/, 'Google'], [/youtube|youtu\.be/, 'YouTube'],
  [/tiktok/, 'TikTok'], [/whatsapp|wa\.me/, 'WhatsApp'], [/t\.co$|twitter|x\.com/, 'X (Twitter)'], [/bing/, 'Bing'], [/messenger/, 'Messenger'], [/linkedin/, 'LinkedIn'], [/pinterest/, 'Pinterest']];
function sourceOf(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const tag = q.get('utm_source') || q.get('ref') || (q.get('fbclid') ? 'facebook' : q.get('gclid') ? 'google ads' : '');
  let host = '';
  try { host = new URL(req.headers.get('referer') || '').hostname.replace(/^www\./, ''); } catch {}
  if (host === req.nextUrl.hostname) host = '';
  const raw = (tag || host).toLowerCase().slice(0, 40);
  if (!raw) return 'Direct';
  return SITES.find(([re]) => re.test(raw))?.[1] || raw;
}

function route(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const first = pathname.split('/')[1];
  if (isLang(first)) {
    const res = NextResponse.next();
    if (req.cookies.get('pm-lang')?.value !== first) res.cookies.set('pm-lang', first, { path: '/', maxAge: 31536000, sameSite: 'lax' });
    return res;
  }
  const saved = req.cookies.get('pm-lang')?.value;
  const accept = (req.headers.get('accept-language') || '').toLowerCase().split(',').map(x => x.trim().slice(0, 2)).find(x => x in LANGS);
  const lang = isLang(saved) ? saved : accept || 'en';
  const url = req.nextUrl.clone();
  url.pathname = `/${lang}${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = { matcher: ['/((?!api|admin|_next|.*\\..*).*)'] };
