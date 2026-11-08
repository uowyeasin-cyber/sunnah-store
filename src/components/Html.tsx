import { getSettings } from '@/lib/catalog';
import { LANGS, type Lang } from '@/lib/i18n';
import { PRESETS, themeStyle } from '@/lib/settings';
import ArtDefs from './ArtDefs';

// Latin display fonts have no Bangla, Arabic or Devanagari letters, so each script gets a matching Noto face.
const SCRIPT: Partial<Record<Lang, [string, string]>> = { bn: ['Noto Serif Bengali', 'Noto Sans Bengali'], ar: ['Noto Naskh Arabic', 'Noto Kufi Arabic'], hi: ['Noto Serif Devanagari', 'Noto Sans Devanagari'] };
// Only the two faces the theme uses are downloaded (all five used to load on every page).
const FACE: Record<string, string> = {
  'Cormorant Garamond': 'Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400', 'Bodoni Moda': 'Bodoni+Moda:ital,opsz,wght@0,6..96,400;1,6..96,400',
  Marcellus: 'Marcellus', Jost: 'Jost:wght@300;400;500', Manrope: 'Manrope:wght@300;400;500',
};

export default async function Html({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const { theme } = await getSettings();
  const style = themeStyle(theme);
  const sc = SCRIPT[lang];
  const fonts = `https://fonts.googleapis.com/css2?family=${FACE[theme.font] || FACE['Cormorant Garamond']}&family=${FACE[theme.body] || FACE.Jost}&display=swap`;
  if (sc) { style['--display'] += `, '${sc[0]}'`; style['--body'] += `, '${sc[1]}'`; }
  return (
    <html lang={lang} dir={LANGS[lang].dir} style={style as React.CSSProperties} data-theme={PRESETS[theme.preset]?.dark ? 'dark' : undefined}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={fonts} />
        {sc && <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?${sc.map(f => `family=${f.replaceAll(' ', '+')}:wght@300;400;500`).join('&')}&display=swap`} />}
      </head>
      <body><ArtDefs />{children}</body>
    </html>
  );
}
