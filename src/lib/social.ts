import 'server-only';
import { db } from './db';
import { key, loadKeys } from './keys';

// Social media posts and ads: tracked links, share links, posting to Facebook and Instagram,
// and bringing back each post's numbers from Meta and YouTube.
export const PLATFORMS: Record<string, { name: string; source: string; manage: string }> = {
  facebook: { name: 'Facebook', source: 'Facebook', manage: 'https://business.facebook.com/latest/home' },
  instagram: { name: 'Instagram', source: 'Instagram', manage: 'https://business.facebook.com/latest/home' },
  youtube: { name: 'YouTube', source: 'YouTube', manage: 'https://studio.youtube.com/' },
  whatsapp: { name: 'WhatsApp', source: 'WhatsApp', manage: 'https://business.whatsapp.com/' },
  tiktok: { name: 'TikTok', source: 'TikTok', manage: 'https://ads.tiktok.com/' },
  messenger: { name: 'Messenger', source: 'Messenger', manage: 'https://business.facebook.com/latest/inbox' },
  x: { name: 'X (Twitter)', source: 'X (Twitter)', manage: 'https://ads.x.com/' },
  google: { name: 'Google Ads', source: 'Google', manage: 'https://ads.google.com/' },
  email: { name: 'Email', source: 'Email', manage: '' },
  other: { name: 'Other', source: 'Other', manage: '' },
};
export const ADS_MANAGER = 'https://adsmanager.facebook.com/';
const GRAPH = 'https://graph.facebook.com/v23.0';

export const site = () => (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
export const goLink = (code: string) => `${site()}/go/${code}`;

export function shareLinks(url: string, text: string) {
  const u = encodeURIComponent(url), t = encodeURIComponent(text), both = encodeURIComponent(text ? `${text}\n${url}` : url);
  return [
    ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${u}`],
    ['WhatsApp', `https://wa.me/?text=${both}`],
    ['X', `https://twitter.com/intent/tweet?url=${u}&text=${t}`],
    ['Telegram', `https://t.me/share/url?url=${u}&text=${t}`],
    ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${u}`],
    ['Pinterest', `https://pinterest.com/pin/create/button/?url=${u}&description=${t}`],
    ['Email', `mailto:?subject=${t}&body=${both}`],
  ] as const;
}

export async function newCode() {
  for (;;) {
    const code = Math.random().toString(36).slice(2, 8);
    if (!(await db.campaign.findUnique({ where: { code } }))) return code;
  }
}

async function graph(path: string, token: string, init?: RequestInit) {
  const sep = path.includes('?') ? '&' : '?';
  const r = await fetch(`${GRAPH}/${path}${init ? '' : `${sep}access_token=${encodeURIComponent(token)}`}`, { ...init, cache: 'no-store' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error?.message || `Meta said ${r.status}`);
  return j;
}

export const metaOn = async () => { await loadKeys(); return !!(key('META_PAGE_ID') && key('META_PAGE_TOKEN')); };
export const instaOn = async () => (await metaOn()) && !!key('META_IG_USER_ID');

// Posts the message and tracked link to the Facebook Page. Returns the new post id.
export async function postToFacebook(message: string, link: string, image = '') {
  await loadKeys();
  const page = key('META_PAGE_ID'), token = key('META_PAGE_TOKEN');
  if (!page || !token) throw new Error('Connect Facebook in Admin → Connections first.');
  const body = image
    ? new URLSearchParams({ url: image, caption: `${message}\n${link}`, access_token: token })
    : new URLSearchParams({ message, link, access_token: token });
  const j = await graph(`${page}/${image ? 'photos' : 'feed'}`, token, { method: 'POST', body });
  return String(j.post_id || j.id);
}

// Instagram needs a picture. The link goes in the caption (Instagram does not make it clickable).
export async function postToInstagram(caption: string, image: string) {
  await loadKeys();
  const ig = key('META_IG_USER_ID'), token = key('META_PAGE_TOKEN');
  if (!ig || !token) throw new Error('Add the Instagram account ID in Admin → Connections first.');
  if (!image) throw new Error('Instagram posts need a picture link.');
  const media = await graph(`${ig}/media`, token, { method: 'POST', body: new URLSearchParams({ image_url: image, caption, access_token: token }) });
  const done = await graph(`${ig}/media_publish`, token, { method: 'POST', body: new URLSearchParams({ creation_id: media.id, access_token: token }) });
  return String(done.id);
}

const n = (v: unknown) => Number(v) || 0;
const ytId = (s: string) => s.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/)?.[1] || (/^[\w-]{11}$/.test(s) ? s : '');

// Brings back the platform's numbers for one campaign. Leaves numbers alone when there is nothing to sync.
export async function syncCampaign(id: string) {
  const c = await db.campaign.findUnique({ where: { id } });
  if (!c?.externalId) return 'Add the post, ad or video ID first.';
  await loadKeys();
  const data: Partial<Record<'views' | 'reach' | 'shares' | 'likes' | 'comments' | 'spend', number>> = {};
  try {
    if (c.platform === 'youtube') {
      const k = key('YOUTUBE_API_KEY'), v = ytId(c.externalId);
      if (!k) return 'Connect YouTube in Admin → Connections first.';
      if (!v) return 'That is not a YouTube video link or ID.';
      const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${v}&key=${encodeURIComponent(k)}`, { cache: 'no-store' });
      const j = await r.json();
      if (j.error) throw new Error(j.error.message);
      const s = j.items?.[0]?.statistics;
      if (!s) return 'YouTube did not find that video.';
      Object.assign(data, { views: n(s.viewCount), likes: n(s.likeCount), comments: n(s.commentCount) });
    } else if (c.kind === 'ad' && ['facebook', 'instagram', 'messenger', 'whatsapp'].includes(c.platform)) {
      const token = key('META_ADS_TOKEN') || key('META_PAGE_TOKEN');
      if (!token) return 'Connect Facebook in Admin → Connections first.';
      const j = await graph(`${c.externalId}/insights?fields=impressions,reach,spend,actions&date_preset=maximum`, token);
      const row = j.data?.[0] || {};
      const act = (t: string) => n(row.actions?.find((a: { action_type: string }) => a.action_type === t)?.value);
      Object.assign(data, { views: n(row.impressions), reach: n(row.reach), spend: n(row.spend), shares: act('post'), likes: act('post_reaction'), comments: act('comment') });
    } else if (c.platform === 'instagram') {
      const token = key('META_PAGE_TOKEN');
      if (!token) return 'Connect Facebook in Admin → Connections first.';
      const m = await graph(`${c.externalId}?fields=like_count,comments_count`, token);
      Object.assign(data, { likes: n(m.like_count), comments: n(m.comments_count) });
      try {
        const ins = await graph(`${c.externalId}/insights?metric=reach,views,shares`, token);
        for (const x of ins.data || []) { const v = n(x.values?.[0]?.value ?? x.total_value?.value); if (x.name === 'reach') data.reach = v; if (x.name === 'views') data.views = v; if (x.name === 'shares') data.shares = v; }
      } catch {}
    } else if (c.platform === 'facebook') {
      const token = key('META_PAGE_TOKEN');
      if (!token) return 'Connect Facebook in Admin → Connections first.';
      const p = await graph(`${c.externalId}?fields=shares,reactions.summary(total_count),comments.summary(total_count)`, token);
      Object.assign(data, { shares: n(p.shares?.count), likes: n(p.reactions?.summary?.total_count), comments: n(p.comments?.summary?.total_count) });
      try {
        const ins = await graph(`${c.externalId}/insights?metric=post_impressions,post_impressions_unique`, token);
        for (const x of ins.data || []) { const v = n(x.values?.[0]?.value); if (x.name === 'post_impressions') data.views = v; if (x.name === 'post_impressions_unique') data.reach = v; }
      } catch {}
    } else return `${PLATFORMS[c.platform]?.name || 'This platform'} has no numbers to bring back. Type them in.`;
  } catch (e) {
    const msg = `Sync failed: ${(e as Error).message}`.slice(0, 300);
    await db.campaign.update({ where: { id }, data: { syncNote: msg } });
    return msg;
  }
  await db.campaign.update({ where: { id }, data: { ...data, syncedAt: new Date(), syncNote: '' } });
  return '';
}
