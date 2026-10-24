import type { Metadata } from 'next';
import { getSettings } from '@/lib/catalog';
import { PRESETS, themeStyle } from '@/lib/settings';
import ArtDefs from '@/components/ArtDefs';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const { store } = await getSettings();
  return { title: { default: store.name, template: `%s · ${store.name}` }, description: store.tagline };
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const { theme } = await getSettings();
  return (
    <html lang="en" style={themeStyle(theme) as React.CSSProperties} data-theme={PRESETS[theme.preset]?.dark ? 'dark' : undefined}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500&family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;1,6..96,400&family=Marcellus&family=Manrope:wght@300;400;500&display=swap" />
      </head>
      <body><ArtDefs />{children}</body>
    </html>
  );
}
