// Sales channels: marketplaces and shops where the same products can be sold, linked back to this store.
// api: how the store talks to it.
//   lazop, shopee, tiktok, ebay, amazon, walmart = connected here: stock (+ price) go out, orders come in
//   etsy   = API planned; product file works now
//   feed   = reads our product feed (/api/feed) by itself
//   csv    = upload our product file in the seller centre (bulk upload)
export type Api = 'lazop' | 'shopee' | 'ebay' | 'amazon' | 'tiktok' | 'walmart' | 'etsy' | 'feed' | 'csv';
export type Channel = { id: string; name: string; region: string; group: string; cur: 'USD' | 'MYR' | 'BDT'; api: Api; seller: string; dev?: string; gateway?: string; auth?: string; mkt?: string; note?: string };

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
  { id: 'amazon-in', name: 'Amazon India', region: 'India', group: 'Bangladesh & South Asia', cur: 'USD', api: 'amazon', seller: 'https://sell.amazon.in/', dev: 'https://developer-docs.amazon.com/sp-api/', gateway: 'https://sellingpartnerapi-eu.amazon.com', auth: 'https://sellercentral.amazon.in', mkt: 'A21TGF2W9O3ADU' },
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
  { id: 'tiktok-my', name: 'TikTok Shop Malaysia', region: 'Malaysia', group: 'Malaysia & South-East Asia', cur: 'MYR', api: 'tiktok', mkt: 'MY', seller: 'https://seller-my.tiktok.com/', dev: 'https://partner.tiktokshop.com/' },
  { id: 'tokopedia', name: 'Tokopedia / TikTok Shop Indonesia', region: 'Indonesia', group: 'Malaysia & South-East Asia', cur: 'USD', api: 'tiktok', mkt: 'ID', seller: 'https://seller.tokopedia.com/', dev: 'https://partner.tiktokshop.com/', note: 'Now part of TikTok Shop.' },
  { id: 'pgmall', name: 'PG Mall', region: 'Malaysia', group: 'Malaysia & South-East Asia', cur: 'MYR', api: 'csv', seller: 'https://seller.pgmall.my/' },
  { id: 'mudah', name: 'Mudah.my', region: 'Malaysia', group: 'Malaysia & South-East Asia', cur: 'MYR', api: 'csv', seller: 'https://www.mudah.my/', note: 'Classified ads.' },
  { id: 'tiktok-sg', name: 'TikTok Shop Singapore', region: 'Singapore', group: 'Malaysia & South-East Asia', cur: 'USD', api: 'tiktok', mkt: 'SG', seller: 'https://seller-sg.tiktok.com/', dev: 'https://partner.tiktokshop.com/' },
  { id: 'tiktok-th', name: 'TikTok Shop Thailand', region: 'Thailand', group: 'Malaysia & South-East Asia', cur: 'USD', api: 'tiktok', mkt: 'TH', seller: 'https://seller-th.tiktok.com/', dev: 'https://partner.tiktokshop.com/' },
  { id: 'tiktok-ph', name: 'TikTok Shop Philippines', region: 'Philippines', group: 'Malaysia & South-East Asia', cur: 'USD', api: 'tiktok', mkt: 'PH', seller: 'https://seller-ph.tiktok.com/', dev: 'https://partner.tiktokshop.com/' },
  { id: 'tiktok-vn', name: 'TikTok Shop Vietnam', region: 'Vietnam', group: 'Malaysia & South-East Asia', cur: 'USD', api: 'tiktok', mkt: 'VN', seller: 'https://seller-vn.tiktok.com/', dev: 'https://partner.tiktokshop.com/' },
  { id: 'amazon-sg', name: 'Amazon Singapore', region: 'Singapore', group: 'Malaysia & South-East Asia', cur: 'USD', api: 'amazon', seller: 'https://sell.amazon.sg/', dev: 'https://developer-docs.amazon.com/sp-api/', gateway: 'https://sellingpartnerapi-fe.amazon.com', auth: 'https://sellercentral.amazon.sg', mkt: 'A19VAU5U5O7RUS' },
  { id: 'zalora', name: 'Zalora', region: 'Malaysia / Singapore / Indonesia / Philippines', group: 'Malaysia & South-East Asia', cur: 'MYR', api: 'csv', seller: 'https://www.zalora.com.my/', note: 'Fashion and modest wear.' },
  { id: 'qoo10', name: 'Qoo10', region: 'Singapore / Japan', group: 'Malaysia & South-East Asia', cur: 'USD', api: 'csv', seller: 'https://www.qoo10.sg/' },
  { id: 'blibli', name: 'Blibli', region: 'Indonesia', group: 'Malaysia & South-East Asia', cur: 'USD', api: 'csv', seller: 'https://seller.blibli.com/' },
  { id: 'bukalapak', name: 'Bukalapak', region: 'Indonesia', group: 'Malaysia & South-East Asia', cur: 'USD', api: 'csv', seller: 'https://www.bukalapak.com/' },
  { id: 'tiki', name: 'Tiki', region: 'Vietnam', group: 'Malaysia & South-East Asia', cur: 'USD', api: 'csv', seller: 'https://tiki.vn/' },
  { id: 'carousell', name: 'Carousell', region: 'Singapore / Malaysia / Philippines', group: 'Malaysia & South-East Asia', cur: 'USD', api: 'csv', seller: 'https://www.carousell.com/', note: 'Classified listings.' },
  { id: 'lelong', name: 'Lelong.my', region: 'Malaysia', group: 'Malaysia & South-East Asia', cur: 'MYR', api: 'csv', seller: 'https://www.lelong.com.my/' },
  // Middle East
  { id: 'amazon-ae', name: 'Amazon UAE', region: 'UAE', group: 'Middle East', cur: 'USD', api: 'amazon', seller: 'https://sell.amazon.ae/', dev: 'https://developer-docs.amazon.com/sp-api/', gateway: 'https://sellingpartnerapi-eu.amazon.com', auth: 'https://sellercentral.amazon.ae', mkt: 'A2VIGQ35RCS4UG' },
  { id: 'amazon-sa', name: 'Amazon Saudi Arabia', region: 'Saudi Arabia', group: 'Middle East', cur: 'USD', api: 'amazon', seller: 'https://sell.amazon.sa/', dev: 'https://developer-docs.amazon.com/sp-api/', gateway: 'https://sellingpartnerapi-eu.amazon.com', auth: 'https://sellercentral.amazon.sa', mkt: 'A17E79C6D8DWNP' },
  { id: 'noon', name: 'noon', region: 'UAE / Saudi Arabia / Egypt', group: 'Middle East', cur: 'USD', api: 'csv', seller: 'https://sell.noon.com/', note: 'API for approved partners; bulk upload works for everyone.' },
  { id: 'trendyol', name: 'Trendyol', region: 'Türkiye / Gulf', group: 'Middle East', cur: 'USD', api: 'csv', seller: 'https://partner.trendyol.com/' },
  { id: 'amazon-eg', name: 'Amazon Egypt', region: 'Egypt', group: 'Middle East', cur: 'USD', api: 'amazon', seller: 'https://sell.amazon.eg/', dev: 'https://developer-docs.amazon.com/sp-api/', gateway: 'https://sellingpartnerapi-eu.amazon.com', auth: 'https://sellercentral.amazon.eg', mkt: 'ARBP9OOSHTCHU' },
  { id: 'amazon-tr', name: 'Amazon Türkiye', region: 'Türkiye', group: 'Middle East', cur: 'USD', api: 'amazon', seller: 'https://sell.amazon.com.tr/', dev: 'https://developer-docs.amazon.com/sp-api/', gateway: 'https://sellingpartnerapi-eu.amazon.com', auth: 'https://sellercentral.amazon.com.tr', mkt: 'A33AVAJ2PDY3EV' },
  { id: 'namshi', name: 'Namshi', region: 'UAE / Saudi Arabia', group: 'Middle East', cur: 'USD', api: 'csv', seller: 'https://www.namshi.com/', note: 'Fashion; now part of noon.' },
  { id: 'hepsiburada', name: 'Hepsiburada', region: 'Türkiye', group: 'Middle East', cur: 'USD', api: 'csv', seller: 'https://merchant.hepsiburada.com/' },
  { id: 'n11', name: 'n11', region: 'Türkiye', group: 'Middle East', cur: 'USD', api: 'csv', seller: 'https://www.n11.com/' },
  { id: 'salla', name: 'Salla / Zid stores', region: 'Saudi Arabia', group: 'Middle East', cur: 'USD', api: 'csv', seller: 'https://salla.sa/', note: 'Your own Saudi store; import our product file.' },
  { id: 'jamalon', name: 'Jamalon', region: 'Jordan / Gulf', group: 'Middle East', cur: 'USD', api: 'csv', seller: 'https://jamalon.com/' },
  // USA & Europe
  { id: 'amazon-us', name: 'Amazon USA', region: 'USA', group: 'USA, Europe & worldwide', cur: 'USD', api: 'amazon', seller: 'https://sell.amazon.com/', dev: 'https://developer-docs.amazon.com/sp-api/', gateway: 'https://sellingpartnerapi-na.amazon.com', auth: 'https://sellercentral.amazon.com', mkt: 'ATVPDKIKX0DER', note: 'Professional plan $39.99/month.' },
  { id: 'amazon-uk', name: 'Amazon UK', region: 'UK', group: 'USA, Europe & worldwide', cur: 'USD', api: 'amazon', seller: 'https://sell.amazon.co.uk/', dev: 'https://developer-docs.amazon.com/sp-api/', gateway: 'https://sellingpartnerapi-eu.amazon.com', auth: 'https://sellercentral.amazon.co.uk', mkt: 'A1F83G8C2ARO7P' },
  { id: 'amazon-eu', name: 'Amazon Germany (and the rest of Europe)', region: 'Europe', group: 'USA, Europe & worldwide', cur: 'USD', api: 'amazon', seller: 'https://sell.amazon.de/', dev: 'https://developer-docs.amazon.com/sp-api/', gateway: 'https://sellingpartnerapi-eu.amazon.com', auth: 'https://sellercentral.amazon.de', mkt: 'A1PA6795UKMFR9' },
  { id: 'ebay', name: 'eBay', region: 'Worldwide', group: 'USA, Europe & worldwide', cur: 'USD', api: 'ebay', seller: 'https://www.ebay.com/sl/sell', dev: 'https://developer.ebay.com/' },
  { id: 'etsy', name: 'Etsy', region: 'Worldwide', group: 'USA, Europe & worldwide', cur: 'USD', api: 'etsy', seller: 'https://www.etsy.com/sell', dev: 'https://developer.etsy.com/', note: 'For handmade or designed items.' },
  { id: 'walmart', name: 'Walmart Marketplace', region: 'USA', group: 'USA, Europe & worldwide', cur: 'USD', api: 'walmart', gateway: 'https://marketplace.walmartapis.com', seller: 'https://marketplace.walmart.com/', dev: 'https://developer.walmart.com/', note: 'Needs a US business registration.' },
  { id: 'tiktok-us', name: 'TikTok Shop USA', region: 'USA', group: 'USA, Europe & worldwide', cur: 'USD', api: 'tiktok', mkt: 'US', seller: 'https://seller-us.tiktok.com/', dev: 'https://partner.tiktokshop.com/' },
  { id: 'temu', name: 'Temu (local sellers)', region: 'USA / Europe', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://seller.temu.com/' },
  { id: 'shein', name: 'SHEIN Marketplace', region: 'USA / Europe', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://sellerhub.shein.com/' },
  { id: 'mercadolibre', name: 'Mercado Libre', region: 'Latin America', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://global-selling.mercadolibre.com/' },
  { id: 'jumia', name: 'Jumia', region: 'Africa', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://vendorhub.jumia.com/' },
  { id: 'amazon-ca', name: 'Amazon Canada', region: 'Canada', group: 'USA, Europe & worldwide', cur: 'USD', api: 'amazon', seller: 'https://sell.amazon.ca/', dev: 'https://developer-docs.amazon.com/sp-api/', gateway: 'https://sellingpartnerapi-na.amazon.com', auth: 'https://sellercentral.amazon.ca', mkt: 'A2EUQ1WTGCTBG2' },
  { id: 'tiktok-uk', name: 'TikTok Shop UK', region: 'UK', group: 'USA, Europe & worldwide', cur: 'USD', api: 'tiktok', mkt: 'GB', seller: 'https://seller-uk.tiktok.com/', dev: 'https://partner.tiktokshop.com/' },
  { id: 'shopee-br', name: 'Shopee Brazil', region: 'Brazil', group: 'USA, Europe & worldwide', cur: 'USD', api: 'shopee', seller: 'https://seller.shopee.com.br/', dev: 'https://open.shopee.com/' },
  { id: 'shopee-mx', name: 'Shopee Mexico', region: 'Mexico', group: 'USA, Europe & worldwide', cur: 'USD', api: 'shopee', seller: 'https://seller.shopee.com.mx/', dev: 'https://open.shopee.com/' },
  { id: 'allegro', name: 'Allegro', region: 'Poland / Central Europe', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://allegro.pl/' },
  { id: 'bol', name: 'bol.com', region: 'Netherlands / Belgium', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://partnerplatform.bol.com/' },
  { id: 'kaufland', name: 'Kaufland Global Marketplace', region: 'Germany / Europe', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://sellerportal.kaufland.de/' },
  { id: 'zalando', name: 'Zalando', region: 'Europe', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://partner.zalando.com/', note: 'Fashion.' },
  { id: 'cdiscount', name: 'Cdiscount', region: 'France', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://seller.cdiscount.com/' },
  { id: 'fnac', name: 'Fnac Darty', region: 'France', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://marketplace.fnacdarty.com/' },
  { id: 'onbuy', name: 'OnBuy', region: 'UK / worldwide', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://www.onbuy.com/gb/sell-on-onbuy/' },
  { id: 'fruugo', name: 'Fruugo', region: 'Europe / worldwide', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://www.fruugo.com/sell', note: 'Sells into 40+ countries with one listing.' },
  { id: 'wish', name: 'Wish', region: 'Worldwide', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://merchant.wish.com/' },
  { id: 'newegg', name: 'Newegg', region: 'USA', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://sellerportal.newegg.com/' },
  { id: 'target', name: 'Target Plus', region: 'USA', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://plus.target.com/', note: 'Invite only.' },
  { id: 'bestbuy', name: 'Best Buy Marketplace', region: 'Canada', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://www.bestbuy.ca/en-ca/marketplace' },
  { id: 'wayfair', name: 'Wayfair', region: 'USA / UK', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://partners.wayfair.com/', note: 'Home goods.' },
  { id: 'rakuten', name: 'Rakuten', region: 'Japan / France', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://www.rakuten.co.jp/ec/' },
  { id: 'ozon', name: 'Ozon', region: 'Russia / Central Asia', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://seller.ozon.ru/' },
  { id: 'wildberries', name: 'Wildberries', region: 'Russia / Central Asia', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://seller.wildberries.ru/' },
  { id: 'takealot', name: 'Takealot', region: 'South Africa', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://seller.takealot.com/' },
  { id: 'konga', name: 'Konga', region: 'Nigeria', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://www.konga.com/' },
  { id: 'jiji', name: 'Jiji', region: 'Africa', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://jiji.ng/', note: 'Classified listings.' },
  { id: 'catch', name: 'Catch / Kogan', region: 'Australia', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://www.kogan.com/au/marketplace/' },
  { id: 'trademe', name: 'Trade Me', region: 'New Zealand', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://www.trademe.co.nz/' },
  { id: 'coupang', name: 'Coupang', region: 'South Korea / Taiwan', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://wing.coupang.com/' },
  { id: 'shopify', name: 'Your own Shopify / WooCommerce store', region: 'Worldwide', group: 'USA, Europe & worldwide', cur: 'USD', api: 'csv', seller: 'https://www.shopify.com/', note: 'Import our product file to run a second shop.' },
  // Free shops that read our product feed
  { id: 'google', name: 'Google Shopping (free listings)', region: 'Worldwide', group: 'Feeds (connect once, updates by itself)', cur: 'USD', api: 'feed', seller: 'https://merchants.google.com/' },
  { id: 'meta', name: 'Facebook & Instagram Shop', region: 'Worldwide', group: 'Feeds (connect once, updates by itself)', cur: 'USD', api: 'feed', seller: 'https://business.facebook.com/commerce' },
  { id: 'pinterest', name: 'Pinterest catalog', region: 'Worldwide', group: 'Feeds (connect once, updates by itself)', cur: 'USD', api: 'feed', seller: 'https://www.pinterest.com/business/catalogs/' },
  { id: 'tiktok-catalog', name: 'TikTok catalog ads', region: 'Worldwide', group: 'Feeds (connect once, updates by itself)', cur: 'USD', api: 'feed', seller: 'https://ads.tiktok.com/' },
  { id: 'snapchat', name: 'Snapchat catalog', region: 'Worldwide', group: 'Feeds (connect once, updates by itself)', cur: 'USD', api: 'feed', seller: 'https://ads.snapchat.com/' },
  { id: 'whatsapp', name: 'WhatsApp Business catalog', region: 'Worldwide', group: 'Feeds (connect once, updates by itself)', cur: 'USD', api: 'feed', seller: 'https://business.whatsapp.com/', note: 'Comes from the Facebook catalog above.' },
  { id: 'bing', name: 'Microsoft (Bing) Shopping', region: 'Worldwide', group: 'Feeds (connect once, updates by itself)', cur: 'USD', api: 'feed', seller: 'https://ads.microsoft.com/' },
];

export const API_LABEL: Record<Api, string> = {
  lazop: 'Connect here: stock, price and orders sync by themselves',
  shopee: 'Connect here (Shopee Open Platform): stock, price and orders sync by themselves',
  amazon: 'Connect here (Amazon SP-API): stock, price and orders sync by themselves',
  ebay: 'Connect here (eBay API): stock, price and orders sync by themselves',
  tiktok: 'Connect here (TikTok Shop API): stock, price and orders sync by themselves',
  walmart: 'Connect here (Walmart API keys): stock, price and orders sync by themselves',
  etsy: 'API sync planned (Etsy API); product file works now',
  feed: 'Paste our feed link once; it updates by itself',
  csv: 'Upload our product file in their seller centre',
};
// Channels this store can link to and sync by itself.
export const LINKABLE: Api[] = ['lazop', 'shopee', 'tiktok', 'ebay', 'amazon', 'walmart'];

// The currency the marketplace really sells in. Prices are only synced where we keep a rate for it.
const LOCAL: Record<string, string> = { Bangladesh: 'BDT', Malaysia: 'MYR', USA: 'USD', Pakistan: 'PKR', 'Sri Lanka': 'LKR', Nepal: 'NPR', India: 'INR', Singapore: 'SGD', Indonesia: 'IDR', Thailand: 'THB', Philippines: 'PHP', Vietnam: 'VND', UAE: 'AED', 'Saudi Arabia': 'SAR', Egypt: 'EGP', 'Türkiye': 'TRY', UK: 'GBP', Europe: 'EUR', Canada: 'CAD', Brazil: 'BRL', Mexico: 'MXN' };
export const money = (ch: Channel) => LOCAL[ch.region] || ch.cur;

export const GROUPS = [...new Set(CHANNELS.map(c => c.group))];
export const channel = (id: string) => CHANNELS.find(c => c.id === id);

// Partners around selling: fulfilment and shipping, getting paid from marketplaces, and help with listings and ads.
export type Partner = { name: string; group: string; where: string; what: string; url: string };
export const PARTNERS: Partner[] = [
  { name: 'Fulfilled by Amazon (FBA)', group: 'Fulfilment & warehouses', where: 'Amazon countries', what: 'Send stock to Amazon; they pack, ship and handle returns. Prime badge.', url: 'https://sell.amazon.com/fulfillment-by-amazon' },
  { name: 'Lazada Fulfilment (FBL)', group: 'Fulfilment & warehouses', where: 'South-East Asia', what: 'Lazada stores and ships your stock.', url: 'https://www.lazada.com.my/' },
  { name: 'Shopee Fulfilment (SBS)', group: 'Fulfilment & warehouses', where: 'South-East Asia', what: 'Shopee stores and ships your stock.', url: 'https://seller.shopee.com.my/' },
  { name: 'Daraz Fulfilment (FBD)', group: 'Fulfilment & warehouses', where: 'Bangladesh, Pakistan', what: 'Daraz warehouses pack and ship for you.', url: 'https://sellercenter.daraz.com.bd/' },
  { name: 'noon Fulfilment (FBN)', group: 'Fulfilment & warehouses', where: 'UAE, Saudi Arabia, Egypt', what: 'noon warehouses pack and ship for you.', url: 'https://sell.noon.com/' },
  { name: 'Walmart Fulfillment Services', group: 'Fulfilment & warehouses', where: 'USA', what: 'Walmart warehouses ship your Walmart orders.', url: 'https://marketplace.walmart.com/walmart-fulfillment-services/' },
  { name: 'TikTok Shop Fulfilment', group: 'Fulfilment & warehouses', where: 'USA, UK, South-East Asia', what: 'TikTok stores and ships your stock.', url: 'https://seller-us.tiktok.com/' },
  { name: 'ShipBob', group: 'Fulfilment & warehouses', where: 'USA, UK, EU, Australia', what: '3PL warehouses for every channel at once.', url: 'https://www.shipbob.com/' },
  { name: 'ShipMonk', group: 'Fulfilment & warehouses', where: 'USA, Europe', what: '3PL warehouses.', url: 'https://www.shipmonk.com/' },
  { name: 'Flexport', group: 'Fulfilment & warehouses', where: 'Worldwide', what: 'Freight from the factory plus warehouses (ex-Deliverr).', url: 'https://www.flexport.com/' },
  { name: 'Easyship', group: 'Shipping & couriers', where: 'Worldwide', what: 'Cheap rates from many couriers, duties shown at checkout.', url: 'https://www.easyship.com/' },
  { name: 'ShipStation', group: 'Shipping & couriers', where: 'USA, UK, Canada, Australia', what: 'Labels for orders from every channel.', url: 'https://www.shipstation.com/' },
  { name: 'DHL eCommerce / Express', group: 'Shipping & couriers', where: 'Worldwide', what: 'International parcels.', url: 'https://www.dhl.com/' },
  { name: 'FedEx / UPS / Aramex', group: 'Shipping & couriers', where: 'Worldwide', what: 'International express.', url: 'https://www.aramex.com/' },
  { name: 'Ninja Van / J&T Express', group: 'Shipping & couriers', where: 'South-East Asia', what: 'Local delivery and COD.', url: 'https://www.ninjavan.co/' },
  { name: 'EasyParcel', group: 'Shipping & couriers', where: 'Malaysia, Singapore', what: 'Compare and book local couriers.', url: 'https://easyparcel.com/' },
  { name: 'Pathao / Steadfast / RedX / Paperfly', group: 'Shipping & couriers', where: 'Bangladesh', what: 'Local delivery and COD (already in Connections).', url: 'https://steadfast.com.bd/' },
  { name: 'Payoneer', group: 'Getting paid', where: 'Worldwide (works in Bangladesh)', what: 'Receive Amazon, Walmart, Etsy and other payouts and send them to a local bank.', url: 'https://www.payoneer.com/' },
  { name: 'WorldFirst', group: 'Getting paid', where: 'Worldwide', what: 'Marketplace payouts; also pays Alibaba and 1688 suppliers.', url: 'https://www.worldfirst.com/' },
  { name: 'PingPong', group: 'Getting paid', where: 'Worldwide', what: 'Marketplace payouts with low fees.', url: 'https://www.pingpongx.com/' },
  { name: 'Wise Business', group: 'Getting paid', where: 'Worldwide', what: 'Local bank details in USD, GBP, EUR and more.', url: 'https://wise.com/business/' },
  { name: 'Airwallex', group: 'Getting paid', where: 'Malaysia, Singapore, worldwide', what: 'Multi-currency accounts and supplier payments.', url: 'https://www.airwallex.com/' },
  { name: 'Amazon Service Provider Network', group: 'Listing, ads & growth', where: 'Amazon countries', what: 'Vetted help for photos, listings, ads, tax and compliance.', url: 'https://sellercentral.amazon.com/gspn' },
  { name: 'Shopee / Lazada partner agencies', group: 'Listing, ads & growth', where: 'South-East Asia', what: 'Certified agencies for store set-up and campaigns.', url: 'https://open.shopee.com/' },
  { name: 'TikTok Shop Partner Center (creators & agencies)', group: 'Listing, ads & growth', where: 'TikTok Shop countries', what: 'Find creators and affiliates to sell your product.', url: 'https://partner.tiktokshop.com/' },
  { name: 'Fiverr / Upwork', group: 'Listing, ads & growth', where: 'Worldwide', what: 'Freelancers for product photos, videos and listings.', url: 'https://www.fiverr.com/' },
  { name: 'SGS / Intertek / Bureau Veritas', group: 'Quality checks', where: 'Worldwide', what: 'Factory audits and pre-shipment inspection before you pay a supplier.', url: 'https://www.sgs.com/' },
  { name: 'QIMA', group: 'Quality checks', where: 'Asia, worldwide', what: 'Online-booked product inspections from about $300.', url: 'https://www.qima.com/' },
];
export const PARTNER_GROUPS = [...new Set(PARTNERS.map(p => p.group))];
