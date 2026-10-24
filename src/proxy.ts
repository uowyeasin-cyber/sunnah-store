import { NextResponse, type NextRequest } from 'next/server';
import { isLang, LANGS } from '@/lib/i18n';

// Shop URLs stay plain (/shop, /p/…); the visitor's language picks which /[lang] page serves them.
// The choice comes from the language menu (pm-lang cookie), else the browser's language.
export function proxy(req: NextRequest) {
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
