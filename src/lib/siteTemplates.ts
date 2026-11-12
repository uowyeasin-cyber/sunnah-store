import type { NavItem, Settings, Slide } from './settings';

// Ready-made looks for a whole site. Applying one (Admin → Site templates) sets the colours, fonts,
// store name and texts, menu, home page slides, and adds sample categories and products the owner
// then edits. Nothing is deleted: old products can be hidden (archived) and brought back.
export type SampleProduct = { name: string; sub: string; usd: number; kind: string; cat: string };
export type SiteTemplate = {
  id: string; label: string; who: string; emoji: string;
  theme: Settings['theme']; store: Omit<Settings['store'], 'logo'>;
  cats: [slug: string, name: string][]; products: SampleProduct[];
  slides: { eyebrow: string; title: string; italic: string; text: string; button: string; look: 'light' | 'dark' }[];
  preorder?: boolean;
};

const T = (preset: string, font: string, body: string, radius: number, accent = ''): Settings['theme'] => ({ preset, accent, font, body, radius });

export const TEMPLATES: SiteTemplate[] = [
  { id: 'shop', label: 'General online shop', who: 'Any shop selling many kinds of products', emoji: '🛒',
    theme: T('white', 'Poppins', 'Inter', 10, '#2563eb'), store: { name: 'My Shop', mono: 'MS', announce: 'Free delivery on orders over $50', tagline: 'Everything you need, delivered to your door.' },
    cats: [['new-arrivals', 'New arrivals'], ['best-sellers', 'Best sellers'], ['accessories', 'Accessories']],
    products: [{ name: 'Classic tote bag', sub: 'Strong cotton, everyday size', usd: 18, kind: 'gift', cat: 'new-arrivals' }, { name: 'Steel water bottle', sub: 'Keeps cold 24 h', usd: 22, kind: 'oil', cat: 'best-sellers' }, { name: 'Gift card', sub: 'Any amount, sent by email', usd: 25, kind: 'gift', cat: 'accessories' }],
    slides: [{ eyebrow: 'New season', title: 'Quality things,', italic: 'fair prices.', text: 'Shop the newest arrivals with fast delivery and easy returns.', button: 'Shop now', look: 'light' }, { eyebrow: 'Best sellers', title: 'Loved by', italic: 'our customers.', text: 'See what everyone is buying this week.', button: 'See best sellers', look: 'dark' }] },
  { id: 'fashion', label: 'Fashion & clothing', who: 'Clothing, shoes, boutique, hijab and abaya shops', emoji: '👗',
    theme: T('noir', 'Bodoni Moda', 'Jost', 0), store: { name: 'Maison', mono: 'MA', announce: 'New collection out now · Free exchange in 7 days', tagline: 'Modern clothing, made to last.' },
    cats: [['women', 'Women'], ['men', 'Men'], ['shoes', 'Shoes'], ['sale', 'Sale']],
    products: [{ name: 'Linen shirt', sub: 'Breathable, relaxed fit', usd: 39, kind: 'sleeve', cat: 'men' }, { name: 'Everyday abaya', sub: 'Soft crepe, black', usd: 59, kind: 'sleeve', cat: 'women' }, { name: 'Leather loafers', sub: 'Hand-stitched', usd: 79, kind: 'gift', cat: 'shoes' }],
    slides: [{ eyebrow: 'New collection', title: 'Dress', italic: 'with intent.', text: 'Clean lines, honest fabrics, made to be worn for years.', button: 'Shop the collection', look: 'dark' }, { eyebrow: 'Sale', title: 'Up to 40% off', italic: 'last season.', text: 'Limited sizes. When they are gone, they are gone.', button: 'Shop the sale', look: 'light' }] },
  { id: 'beauty', label: 'Beauty & cosmetics', who: 'Skincare, makeup, perfume and salon products', emoji: '💄',
    theme: T('blush', 'Playfair Display', 'Manrope', 14), store: { name: 'Glow Studio', mono: 'GS', announce: 'Original products only · Cash on delivery', tagline: 'Skincare and beauty you can trust.' },
    cats: [['skincare', 'Skincare'], ['makeup', 'Makeup'], ['fragrance', 'Fragrance']],
    products: [{ name: 'Vitamin C serum', sub: '30 ml, brightening', usd: 19, kind: 'oil', cat: 'skincare' }, { name: 'Matte lipstick', sub: 'Long-lasting, 6 shades', usd: 12, kind: 'attar', cat: 'makeup' }, { name: 'Rose perfume oil', sub: 'Alcohol free, 10 ml', usd: 24, kind: 'attar', cat: 'fragrance' }],
    slides: [{ eyebrow: 'Skincare', title: 'Your skin,', italic: 'only better.', text: 'Gentle formulas that work, checked for authenticity.', button: 'Shop skincare', look: 'light' }, { eyebrow: 'Gift sets', title: 'Beauty boxes', italic: 'for every budget.', text: 'Ready-made gifts, wrapped and delivered.', button: 'See gift sets', look: 'light' }] },
  { id: 'medical', label: 'Doctor & clinic', who: 'Doctors, dentists, clinics: sell consultations and checkups', emoji: '🩺',
    theme: T('clinic', 'Poppins', 'Inter', 12), store: { name: 'Dr. Your Name Clinic', mono: 'DR', announce: 'Online and in-person appointments · Sat–Thu, 9am–9pm', tagline: 'Trusted care for you and your family.' },
    cats: [['consultations', 'Consultations'], ['checkups', 'Health checkups'], ['care-products', 'Care products']],
    products: [{ name: 'Online video consultation', sub: '20 minutes with the doctor', usd: 15, kind: 'gift', cat: 'consultations' }, { name: 'Clinic visit', sub: 'In-person appointment', usd: 20, kind: 'gift', cat: 'consultations' }, { name: 'Full body checkup', sub: 'Blood tests and report review', usd: 60, kind: 'gift', cat: 'checkups' }, { name: 'Digital thermometer', sub: 'Fast, accurate reading', usd: 8, kind: 'gift', cat: 'care-products' }],
    slides: [{ eyebrow: 'Book an appointment', title: 'Care that', italic: 'listens.', text: 'See the doctor online or at the clinic. Pick a time, pay online, get a reminder.', button: 'Book now', look: 'light' }, { eyebrow: 'Health checkups', title: 'Know your health,', italic: 'early.', text: 'Checkup packages for every age, with the report explained to you.', button: 'See packages', look: 'dark' }] },
  { id: 'pharmacy', label: 'Pharmacy & health', who: 'Pharmacies, medical shops, health supplements', emoji: '💊',
    theme: T('mint', 'Poppins', 'Inter', 10), store: { name: 'Care Pharmacy', mono: 'CP', announce: 'Genuine medicine · Delivery in 24 hours', tagline: 'Your neighbourhood pharmacy, online.' },
    cats: [['medicine', 'Medicine'], ['vitamins', 'Vitamins & supplements'], ['baby-care', 'Baby care'], ['devices', 'Health devices']],
    products: [{ name: 'Vitamin D3 1000 IU', sub: '60 capsules', usd: 9, kind: 'oil', cat: 'vitamins' }, { name: 'Blood pressure monitor', sub: 'Automatic, arm cuff', usd: 35, kind: 'gift', cat: 'devices' }, { name: 'Baby wipes', sub: 'Pack of 3', usd: 6, kind: 'gift', cat: 'baby-care' }],
    slides: [{ eyebrow: 'Delivered fast', title: 'Medicine at', italic: 'your door.', text: 'Upload your prescription or order everyday health items.', button: 'Order now', look: 'light' }] },
  { id: 'grocery', label: 'Grocery & fresh food', who: 'Grocery, fruits, fish, meat, organic food', emoji: '🥬',
    theme: T('mint', 'Poppins', 'Manrope', 14, '#16a34a'), store: { name: 'Fresh Basket', mono: 'FB', announce: 'Same-day delivery before 2pm', tagline: 'Fresh food from farm to home.' },
    cats: [['fruits-vegetables', 'Fruits & vegetables'], ['fish-meat', 'Fish & meat'], ['rice-oil', 'Rice, oil & spices'], ['snacks', 'Snacks']],
    products: [{ name: 'Mango (Himsagar)', sub: '1 kg', usd: 2.5, kind: 'gift', cat: 'fruits-vegetables' }, { name: 'Mustard oil', sub: '1 litre, cold pressed', usd: 3.5, kind: 'oil', cat: 'rice-oil' }, { name: 'Hilsa fish', sub: 'About 1 kg', usd: 14, kind: 'gift', cat: 'fish-meat' }],
    slides: [{ eyebrow: 'Fresh today', title: 'Fresh food,', italic: 'every day.', text: 'Order by 2pm, eat fresh tonight.', button: 'Shop fresh', look: 'light' }] },
  { id: 'restaurant', label: 'Restaurant & food', who: 'Restaurants, cloud kitchens, cake and home food', emoji: '🍔',
    theme: T('terracotta', 'Playfair Display', 'Poppins', 12), store: { name: 'Spice Kitchen', mono: 'SK', announce: 'Order online · Hot delivery in 45 minutes', tagline: 'Home-style food, cooked fresh.' },
    cats: [['mains', 'Main dishes'], ['snacks', 'Snacks'], ['desserts', 'Desserts'], ['drinks', 'Drinks']],
    products: [{ name: 'Kacchi biryani', sub: 'Full plate, with borhani', usd: 4, kind: 'gift', cat: 'mains' }, { name: 'Chicken burger', sub: 'With fries', usd: 3, kind: 'gift', cat: 'snacks' }, { name: 'Chocolate cake', sub: '1 pound', usd: 6, kind: 'gift', cat: 'desserts' }],
    slides: [{ eyebrow: 'Hungry?', title: 'Fresh from', italic: 'our kitchen.', text: 'Order online and get it hot at your door.', button: 'See the menu', look: 'dark' }] },
  { id: 'electronics', label: 'Gadgets & electronics', who: 'Phones, accessories, computer and gadget shops', emoji: '📱',
    theme: T('slate', 'Poppins', 'Inter', 12), store: { name: 'Gadget Hub', mono: 'GH', announce: 'Official warranty · EMI available', tagline: 'Latest gadgets at the best price.' },
    cats: [['phones', 'Phones'], ['audio', 'Audio'], ['accessories', 'Accessories'], ['smart-watches', 'Smart watches']],
    products: [{ name: 'Wireless earbuds', sub: 'Noise cancelling, 30 h battery', usd: 29, kind: 'gift', cat: 'audio' }, { name: '65W fast charger', sub: 'USB-C, 3 ports', usd: 19, kind: 'gift', cat: 'accessories' }, { name: 'Smart watch', sub: 'Heart rate, calls, 7-day battery', usd: 45, kind: 'gift', cat: 'smart-watches' }],
    slides: [{ eyebrow: 'Just in', title: 'The newest tech,', italic: 'best price.', text: 'Original products with warranty, delivered fast.', button: 'Shop gadgets', look: 'dark' }] },
  { id: 'promo', label: 'Sale & campaign (one product)', who: 'Flash sales, 11.11 campaigns, single product launches', emoji: '🔥',
    theme: T('sunshine', 'Poppins', 'Poppins', 16), store: { name: 'Mega Sale', mono: 'MS', announce: '🔥 Flash sale ends soon · Up to 50% off', tagline: 'Big deals, only for a short time.' },
    cats: [['deals', 'Hot deals'], ['combo', 'Combo offers']],
    products: [{ name: 'Hero product', sub: 'Launch price, limited stock', usd: 19, kind: 'gift', cat: 'deals' }, { name: 'Combo pack', sub: 'Buy 2 and save 20%', usd: 34, kind: 'gift', cat: 'combo' }],
    slides: [{ eyebrow: 'Limited time', title: 'Up to 50% off.', italic: 'Today only.', text: 'Grab the deal before the timer runs out.', button: 'Grab the deal', look: 'light' }, { eyebrow: 'Combo offer', title: 'Buy 2,', italic: 'save more.', text: 'Bundle and save on every combo.', button: 'See combos', look: 'dark' }] },
  { id: 'islamic', label: 'Islamic lifestyle', who: 'Attar, miswak, prayer mats, Islamic books and gifts', emoji: '🕌',
    theme: T('emerald', 'Cormorant Garamond', 'Jost', 2), store: { name: 'Sunnah Lifestyle', mono: 'SL', announce: 'Halal, alcohol-free products · Delivery worldwide', tagline: 'Sunnah products for daily life.' },
    cats: [['attar', 'Attar & oils'], ['miswak', 'Miswak'], ['prayer', 'Prayer essentials'], ['gifts', 'Gift sets']],
    products: [{ name: 'Amber oud attar', sub: 'Alcohol free, 6 ml', usd: 14, kind: 'attar', cat: 'attar' }, { name: 'Peelu miswak sticks', sub: 'Pack of 10, sealed', usd: 6, kind: 'sticks', cat: 'miswak' }, { name: 'Prayer mat', sub: 'Soft, foldable', usd: 18, kind: 'gift', cat: 'prayer' }],
    slides: [{ eyebrow: 'Sunnah daily', title: 'Small sunnahs,', italic: 'every day.', text: 'Attar, miswak and prayer essentials, chosen with care.', button: 'Shop now', look: 'dark' }] },
  { id: 'books', label: 'Books & courses', who: 'Bookshops, publishers, online courses and coaching', emoji: '📚',
    theme: T('cream', 'Playfair Display', 'Manrope', 6), store: { name: 'Book Corner', mono: 'BC', announce: 'Free delivery on 3 books or more', tagline: 'Books and courses that change how you think.' },
    cats: [['books', 'Books'], ['courses', 'Online courses'], ['kids', 'For kids']],
    products: [{ name: 'Bestselling novel', sub: 'Paperback, 320 pages', usd: 7, kind: 'gift', cat: 'books' }, { name: 'Spoken English course', sub: '30 video lessons, lifetime access', usd: 15, kind: 'gift', cat: 'courses' }, { name: 'Picture book set', sub: 'Ages 3–6, set of 5', usd: 12, kind: 'gift', cat: 'kids' }],
    slides: [{ eyebrow: 'New this month', title: 'Read more,', italic: 'learn more.', text: 'Handpicked books and courses delivered to you.', button: 'Browse books', look: 'light' }] },
  { id: 'home', label: 'Home, furniture & decor', who: 'Furniture, decor, kitchen and handicraft shops', emoji: '🛋️',
    theme: T('sandalwood', 'Marcellus', 'Jost', 4), store: { name: 'Nest & Wood', mono: 'NW', announce: 'Free delivery inside the city · Easy installation', tagline: 'Warm, well-made things for your home.' },
    cats: [['furniture', 'Furniture'], ['decor', 'Decor'], ['kitchen', 'Kitchen'], ['handicraft', 'Handicraft']],
    products: [{ name: 'Oak side table', sub: 'Solid wood, 45 cm', usd: 65, kind: 'gift', cat: 'furniture' }, { name: 'Ceramic vase', sub: 'Handmade, matte', usd: 18, kind: 'gift', cat: 'decor' }, { name: 'Jute basket set', sub: 'Set of 3, handwoven', usd: 22, kind: 'gift', cat: 'handicraft' }],
    slides: [{ eyebrow: 'Made to last', title: 'A home that', italic: 'feels like you.', text: 'Furniture and decor in natural materials.', button: 'Shop the home', look: 'light' }] },
];

export const nav = (t: SiteTemplate): NavItem[] => [
  { label: 'Shop all', to: 'all', show: true },
  ...t.cats.map(([slug, name]) => ({ label: name, to: `cat:${slug}`, show: true })),
  { label: 'Track order', to: 'track', show: true },
];

export const slides = (t: SiteTemplate): Slide[] => t.slides.map((x, i) => ({
  id: `${t.id}-${i + 1}`, eyebrow: x.eyebrow, title: x.title, italic: x.italic, text: x.text, product: '', cta: '', look: x.look,
  image: '', video: '', motion: 'fade', buttons: [{ label: x.button, href: '/shop' }],
}));
