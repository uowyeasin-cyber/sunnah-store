// Offer badge looks. An offer's style is "look" or "look|background|text" when the owner picked their own colours.
export const BADGES: [string, string][] = [
  ['ribbon', 'Gold ribbon'], ['ribbon-red', 'Red sale ribbon'], ['ribbon-black', 'Black ribbon'], ['ribbon-emerald', 'Emerald ribbon'],
  ['stamp', 'Black & gold seal'], ['burst', 'Sale starburst'], ['pill', 'Ivory label'], ['tag', 'Price tag'],
  ['corner', 'Corner flag'], ['banner', 'Bottom banner'], ['new', 'New'], ['best', 'Best seller'],
  ['hot', 'Hot deal'], ['eid', 'Eid special'], ['limited', 'Limited edition'], ['timer', 'Countdown'], ['glow', 'Gold glow (no label)'],
];
const HEX = /^#[0-9a-f]{6}$/i;

export function parseBadge(style: string) {
  const [look = 'pill', bg = '', fg = ''] = (style || 'pill').split('|');
  const ok = BADGES.some(([k]) => k === look) ? look : 'pill';
  const cls = ok.startsWith('ribbon-') ? `ribbon ${ok}` : ok;
  const colors: Record<string, string> = {};
  if (HEX.test(bg)) colors.background = bg;
  if (HEX.test(fg)) colors.color = fg;
  return { look: ok, cls, colors, bg: HEX.test(bg) ? bg : '', fg: HEX.test(fg) ? fg : '' };
}

// From the admin form: the picked look, plus colours only when "Use my colours" is ticked.
export function badgeFrom(fd: FormData, field: string) {
  const look = String(fd.get(field) || 'pill');
  const ok = BADGES.some(([k]) => k === look) ? look : 'pill';
  if (!fd.get('badgeOwn')) return ok;
  const bg = String(fd.get('badgeBg') || ''), fg = String(fd.get('badgeFg') || '');
  return HEX.test(bg) || HEX.test(fg) ? `${ok}|${HEX.test(bg) ? bg : ''}|${HEX.test(fg) ? fg : ''}` : ok;
}
