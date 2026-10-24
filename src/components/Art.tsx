import { art, penSVG } from '@/lib/art';
import type { CardProduct } from '@/lib/catalog';

// Product photo when uploaded, otherwise the built-in drawing.
export default function Art({ p, open = false, brand }: { p: CardProduct; open?: boolean; brand?: string }) {
  if (p.image) return <img src={p.image} alt={`${p.name}, ${p.sub}`} />;
  const svg = p.kind === 'pen' ? penSVG(p, open) : art({ ...p, brand });
  return <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: svg }} />;
}
