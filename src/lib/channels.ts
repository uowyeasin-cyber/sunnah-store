// Sales channels: marketplaces and shops where the same products can be sold, linked back to this store.
// api: how the store talks to it.
//   lazop  = Lazada / Daraz Open Platform (connected here: stock + price sync, orders come in)
//   shopee, ebay, amazon, tiktok, walmart, etsy, noon, ... = API planned; needs a seller account and an approved app first
//   feed   = reads our product feed (/api/feed) by itself
//   csv    = upload our product file in the seller centre (bulk upload)
export type Api = 'lazop' | 'shopee' | 'ebay' | 'amazon' | 'tiktok' | 'walmart' | 'etsy' | 'feed' | 'csv';
export type Channel = { id: string; name: string; region: string; group: string; cur: 'USD' | 'MYR' | 'BDT'; api: Api; seller: string; dev?: string; gateway?: string; auth?: string; note?: string };

export const CHANNELS: Channel[] = [
  // Bangladesh
  { id: 'daraz-bd', name: 'Daraz Bangladesh', region: 'Bangladesh', group: 'Bangladesh & South Asia', cur: 'BDT', api: 'lazop', seller: 'https://sellercenter.daraz.com.bd/', dev: 'https://open.daraz.com/', gateway: 'https://api.daraz.com.bd/rest', auth: 'https://api.daraz.com.bd/oauth/authorize' },
  { id: 'daraz-pk', name: 'Daraz Pakistan', region: 'Pakistan', group: 'Bangladesh & South Asia', cur: 'USD', api: 'lazop', seller: 'https://sellercenter.daraz.pk/', dev: 'https://open.daraz.com/', gateway: 'https://api.daraz.pk/rest', auth: 'https://api.daraz.pk/oauth/authorize' },
  { id: 'daraz-lk', name: 'Daraz Sri Lanka', region: 'Sri Lanka', group: 'Bangladesh & South Asia', cur: 'USD', api: 'lazop', seller: 'https://sellercenter.daraz.lk/', dev: 'https://open.daraz.com/', gateway: 'https://api.daraz.lk/rest', auth: 'https://api.daraz.lk/oauth/authorize' },
  { id: 'daraz-np', name: 'Daraz Nepal', region: 'Nepal', group: 'Bangladesh & South Asia', cur: 'USD', api: 'lazop', seller: 'https://sellercenter.daraz.com.np/', dev: 'https://open.daraz.com/', gateway: 'https://api.daraz.com.np/rest', auth: 'https://api.daraz.com.np/oauth/authorize' },
  { id: 'rokomari', name: 'Rokomari', region: 'Bangladesh', group: 'Bangladesh & South Asia', cur: 'BDT', api: 'csv', seller: 'https://www.rokomari.com/', note: 'Apply as a seller; they take a product sheet.' },
  { id: 'othoba', name: 'Othoba', region: 'Bangladesh', group: 'Bangladesh & South Asia', cur: 'BDT', api: 'csv', seller: 'https://www.othoba.com/' },
  { id: 'pickaboo', name: 'Pickaboo', region: 'Bangladesh', group: 'Bangladesh & South Asia', cur: 'BDT', api: 'csv', seller: 'https://www.pickaboo.com/' },
  { id: 'chaldal', name: 'Chaldal', region: 'Bangladesh', group: 'Bangladesh & South Asia', cur: 'BDT', api: 'csv', seller: 'https://chaldal.com/' },
  { id: 'bikroy', name: 'Bikroy', region: 'Bangladesh', group: 'Bangladesh & South Asia', cur: 'BDT', api: 'csv', seller: 'https://bikroy.com/', note: 'Classified ads, one post per product.' },
  { id: 'flipkart', name: 'Flipkart', region: 'India', group: 'Bangladesh & South Asia', cur: 'USD', api: 'csv', seller: 'https://seller.flipkart.com/', note: 'Needs an Indian GST registration.' },
  { id: 'meesho', name: 'Meesho', region: 'India', group: 'Bangladesh & South Asia', cur: 'USD', api: 'csv', seller: 'https://supplier.meesho.com/', note: 'Needs an Indian GST registration.' },
  { id: 'amazon-in', name: 'Amazon India', region: 'India', group: 'Bangladesh & South Asia', cur: 'USD', api: 'amazon', seller: 'https://sell.amazon.in/', dev: 'https://developer-docs.amazon.com/sp-api/' },
  // Malaysia & South-East Asia
  { id: 'lazada-my', name: 'Lazada Malaysia', region: 'Malaysia', group: 'Malaysia & South-East Asia', cur: 'MYR', api: 'lazop', seller: 'https://sellercenter.lazada.com.my/', dev: 'https://open.lazada.com/', gateway: 'https://api.lazada.com.my/rest', auth: 'https://auth.lazada.com/oauth/authorize' },
  { id: 'lazada-sg', name: 'Lazada Singapore', region: 'Singapore', group: 'Malaysia & South-East Asia', cur: 'USD', api: 'lazop', seller: 'https://sellercenter.lazada.sg/', dev: 'https://open.lazada.com/', gateway: 'https://api.lazada.sg/rest', auth: 'https://auth.lazada.com/oauth/authorize' },
  { id: 'lazada-id', name: 'Lazada Indonesia', region: 'Indonesia', group: 'Malaysia & South-East Asia', cur: 'USD', api: 'lazop', seller: 'https://sellercenter.lazada.co.id/', dev: 'https://open.lazada.com/', gateway: 'https://api.lazada.co.id/rest', auth: 'https://auth.lazada.com/oauth/authorize' },
  { id: 'lazada-th', name: 'Lazada Thailand', region: 'Thailand', group: 'Malaysia & South-East Asia', cur: 'USD', api: 'lazop', seller: 'https://sellercenter.lazada.co.th/', dev: 'https://open.lazada.com/', gateway: 'https://api.lazada.co.th/rest', auth: 'https://auth.lazada.com/oauth/authorize' },
  { id: 'lazada-ph', name: 'Lazada Philippines', region: 'Philippines', group: 'Malaysia & South-East Asia', cur: 'USD', api: 'lazop', seller: 'https://sellercenter.lazada.com.ph/', dev: 'https://open.lazada.com/', gateway: 'https://api.lazada.com.ph/rest', auth: 'https://auth.lazada.com/oauth/authorize' },
  { id: 'lazada-vn', name: 'Lazada Vietnam', region: 'Vietnam', group: 'Malaysia & South-East Asia', cur: 'USD', api: 'lazop', seller: 'https://sellercenter.lazada.vn/', dev: 'https://open.lazada.com/', gateway: 'https://api.lazada.vn/rest', auth: 'https://auth.lazada.com/oauth/authorize' },
  { id: 'shopee-my', name: 'Shopee Malaysia', region: 'Malaysia', group: 'Malaysia & South-East Asia', cur: 'MYR', api: 'shopee', seller: 'https://seller.shopee.com.my/', dev: 'https://open.shopee.com/' },
  { id: 'shopee-sg', name: 'Shopee Singapore', region: 'Singapore', group: 'Malaysia & South-East Asia', cur: 'USD', api: 'shopee', seller: 'https://seller.shopee.sg/', dev: 'https://open.shopee.com/' },
  { id: 'shopee-id', name: 'Shopee Indonesia', region: 'Indonesia', group: 'Malaysia & South-East Asia', cur: 'USD', api: 'shopee', seller: 'https://seller.shopee.co.id/', dev: 'https://open.shopee.com/' },
  { id: 'shopee-th', name: 'Shopee Thailand', region: 'Thailand', group: 'Malaysia & South-East Asia', cur: 'USD', api: 'shopee', seller: 'https://seller.shopee.co.th/', dev: 'https://open.shopee.com/' },
  { id: 'shopee-ph', name: 'Shopee Philippines', region: 'Philippines', group: 'Malaysia & South-East Asia', cur: 'USD', api: 'shopee', seller: 'https://seller.shopee.ph/', dev: 'https://open.shopee.com/' },
  { id: 'shopee-vn', name: 'Shopee Vietnam', region: 'Vietnam', group: 'Malaysia & South-East Asia', cur: 'USD', api: 'shopee', seller: 'https://banhang.shopee.vn/', dev: 'https://open.shopee.com/' },
  { id: 'tiktok-my', name: 'TikTok Shop Malaysia', region: 'Malaysia', group: 'Malaysia & South-East Asia', cur: 'MYR', api: 'tiktok', seller: 'https://seller-my.tiktok.com/', dev: 'https://partner.tiktokshop.com/' },
  { id: 'tokopedia', name: 'Tokopedia', region: 'Indonesia', group: 'Malaysia & South-East Asia', cur: 'USD', api: 'tiktok', seller: 'https://seller.tokopedia.com/', dev: 'https://partner.tiktokshop.com/', note: 'Now part of TikTok Shop.' },
  { id: 'pgmall', name: 'PG Mall', region: 'Malaysia', group: 'Malaysia & South-East Asia', cur: 'MYR', api: 'csv', seller: 'https://seller.pgmall.my/' },
  { id: 'mudah', name: 'Mudah.my', region: 'Malaysia', group: 'Malaysia & South-East Asia', cur: 'MYR', api: 'csv', seller: 'https://www.mudah.my/', note: 'Classified ads.' },
  // Middle East
  { id: 'amazon-ae', name: 'Amazon UAE', region: 'UAE', group: 'Middle East', cur: 'USD', api: 'amazon', seller: 'https://sell.amazon.ae/', dev: 'https://developer-docs.amazon.com/sp-api/' },
  { id: 'amazon-sa', name: 'Amazon Saudi Arabia', region: 'Saudi Arabia', group: 'Middle East', cur: 'USD', api: 'amazon', seller: 'https://sell.amazon.sa/', dev: 'https://developer-docs.amazon.com/sp-api/' },
  { id: 'noon', name: 'noon', region: 'UAE / Saudi Arabia / Egypt', group: 'Middle East', cur: 'USD', api: 'csv', seller: 'https://sell.noon.com/', note: 'API for approved partners; bulk upload works for everyone.' },
  { id: 'trendyol', name: 'Trendyol', region: 'Türkiye / Gulf', group: 'Middle East', cur: 'USD', api: 'csv', seller: 'https://partner.trendyol.com/' },
  // USA & Europe
  { id: 'amazon-us', name: 'Amazon USA', region: 'USA', group: 'USA, Europe & worldwide', cur: 'USD', api: 'amazon', seller: 'https://sell.amazon.com/', dev: 'https://developer-docs.amazon.com/sp-api/', note: 'Professional plan $39.99/month.' },
  { id: 'amazon-uk', name: 'Amazon UK', region: 'UK', group: 'USA, Europe & worldwide', cur: 'USD', api: 'amazon', seller: 'https://sell.amazon.co.uk/', dev: 'https://developer-docs.amazon.com/sp-api/' },
  { id: 'amazon-eu', name: 'Amazon Europe (DE, FR, IT, ES, NL)', region: 'Europe', group: 'USA, Europe & worldwide', cur: 'USD', api: 'amazon', seller: 'https://sell.amazon.de/', dev: 'https://developer-docs.amazon.com/sp-api/' },
  { id: 'ebay', name: 'eBay', region: 'Worldwide', group: 'USA, Europe & worldwide', cur: 'USD', api: 'ebay', seller: 'https://www.ebay.com/sl/sell', dev: 'https://developer.ebay.com/' },
  { id: 'etsy', name: 'Etsy', region: 'Worldwide', group: 'USA, Europe & worldwide', cur: 'USD', api: 'etsy', seller: 'https://www.etsy.com/sell', dev: 'https://developer.etsy.com/', note: 'For handmade or designed items.' },
  { id: 'walmart', name: 'Walmart Marketplace', region: 'USA', group: 'USA, Europe & worldwide', cur: 'USD', api: 'walmart', seller: 'https://marketplace.walmart.com/', dev: 'https://developer.walmart.com/', note: 'Needs a US business registration.' },
  { id: 'tiktok-us', name: 'TikTok Shop USA / UK', region: 'USA / UK', group: 'USA, Europe & worldwide', cur: 'USD', api: 'tiktok', seller: 'https://seller-us.tiktok.com/', dev: 'https://partner.tiktokshop.com/' },
  { id: 'temu', name: 'Temu (local sellers)', region: 'USA / Europe', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://seller.temu.com/' },
  { id: 'shein', name: 'SHEIN Marketplace', region: 'USA / Europe', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://sellerhub.shein.com/' },
  { id: 'mercadolibre', name: 'Mercado Libre', region: 'Latin America', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://global-selling.mercadolibre.com/' },
  { id: 'jumia', name: 'Jumia', region: 'Africa', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://vendorhub.jumia.com/' },
  // Free shops that read our product feed
  { id: 'google', name: 'Google Shopping (free listings)', region: 'Worldwide', group: 'Feeds (connect once, updates by itself)', cur: 'USD', api: 'feed', seller: 'https://merchants.google.com/' },
  { id: 'meta', name: 'Facebook & Instagram Shop', region: 'Worldwide', group: 'Feeds (connect once, updates by itself)', cur: 'USD', api: 'feed', seller: 'https://business.facebook.com/commerce' },
  { id: 'pinterest', name: 'Pinterest catalog', region: 'Worldwide', group: 'Feeds (connect once, updates by itself)', cur: 'USD', api: 'feed', seller: 'https://www.pinterest.com/business/catalogs/' },
  { id: 'bing', name: 'Microsoft (Bing) Shopping', region: 'Worldwide', group: 'Feeds (connect once, updates by itself)', cur: 'USD', api: 'feed', seller: 'https://ads.microsoft.com/' },
];

export const API_LABEL: Record<Api, string> = {
  lazop: 'Connect here: stock, price and orders sync by themselves',
  shopee: 'API sync coming next (Shopee Open Platform); product file works now',
  amazon: 'API sync planned (Amazon SP-API); product file works now',
  ebay: 'API sync planned (eBay API); product file works now',
  tiktok: 'API sync planned (TikTok Shop Partner API); product file works now',
  walmart: 'API sync planned (Walmart API); product file works now',
  etsy: 'API sync planned (Etsy API); product file works now',
  feed: 'Paste our feed link once; it updates by itself',
  csv: 'Upload our product file in their seller centre',
};
export const GROUPS = [...new Set(CHANNELS.map(c => c.group))];
export const channel = (id: string) => CHANNELS.find(c => c.id === id);
