import { Product, Review } from '../types';
import { DIVISION_IMAGES } from './aksMart';

// ── AKS Mart catalog ───────────────────────────────────────────────────────
// Keeps the exact Product schema (src/types.ts). A tiny builder fills
// type-safe defaults so each catalog entry stays short and editable.

const MATERIAL_DEFAULTS: Record<string, { fabric: string; care: string }> = {
  food: { fabric: 'Premium quality food-grade pack', care: 'Store in a cool, dry place. Seal after opening.' },
  craft: { fabric: 'Handmade natural materials', care: 'Keep dry. Dust with a soft dry cloth.' },
  home: { fabric: 'Durable, skin-friendly textile', care: 'Machine / gentle wash as per label.' },
  beauty: { fabric: 'Gentle formula for daily use', care: 'For external use. Keep away from direct sunlight.' },
  print: { fabric: 'Premium print-ready material', care: 'Handle with care; store flat and dry.' },
};

type MkInput = {
  name: string;
  brand: Product['brand'];
  category: Product['category'];
  subcategory: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  description: string;
  features?: string[];
  materials?: Partial<Product['materials']>;
  fit?: Product['fit'];
  pattern?: Product['pattern'];
  sleeve?: Product['sleeve'];
  sizes?: string[];
  occasion?: string;
  tags?: string[];
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isTrending?: boolean;
  isClearance?: boolean;
  featuredOrder?: number;
};

let seq = 0;

// Deterministic pseudo-random helpers — varied but STABLE values across reloads.
const seededFrac = (n: number) => {
  const x = Math.sin(n * 9973) * 43758.5453;
  return x - Math.floor(x);
};
const seededInt = (n: number, min: number, max: number) => min + Math.floor(seededFrac(n) * (max - min + 1));

// Sensible default colour per division (replaces the meaningless "Standard" on every product).
const COLOR_DEFAULTS: Record<string, { name: string; hex: string }> = {
  food: { name: 'Natural', hex: '#efeadd' },
  craft: { name: 'Handwoven Natural', hex: '#d9c7a7' },
  home: { name: 'Ivory', hex: '#f3efe6' },
  beauty: { name: 'Original', hex: '#f7f4ef' },
  print: { name: 'White', hex: '#ffffff' },
};

function mk(p: MkInput): Product {
  seq += 1;
  const cat = p.category;
  const pool = DIVISION_IMAGES[cat] || DIVISION_IMAGES.food;
  const image = pool[(seq - 1) % pool.length];
  // Varied stock levels instead of an identical decay pattern on every product.
  const sizes = p.sizes
    ? p.sizes.map((size, i) => ({ size, inStock: true, stockCount: seededInt(seq * 13 + i, 5, 60) }))
    : [{ size: 'One Size', inStock: true, stockCount: seededInt(seq * 11 + 5, 6, 55) }];

  return {
    id: `akm-${cat}-${String(seq).padStart(2, '0')}`,
    sku: `AKM-${cat.slice(0, 3).toUpperCase()}-${String(seq).padStart(3, '0')}`,
    name: p.name,
    slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + String(seq).padStart(2, '0'),
    brand: p.brand,
    category: cat,
    subcategory: p.subcategory,
    price: p.price,
    originalPrice: p.originalPrice,
    discountPercent: p.discountPercent,
    rating: Math.round((3.8 + seededFrac(seq) * 1.1) * 10) / 10,
    reviewsCount: seededInt(seq * 7 + 3, 3, 46),
    isNewArrival: p.isNewArrival ?? false,
    isBestSeller: p.isBestSeller ?? false,
    isTrending: p.isTrending ?? false,
    isClearance: p.isClearance ?? false,
    featuredOrder: p.featuredOrder,
    description: p.description,
    features: p.features ?? [],
    materials: { ...MATERIAL_DEFAULTS[cat], ...p.materials },
    fit: p.fit,
    pattern: p.pattern,
    sleeve: p.sleeve,
    colors: [{ name: COLOR_DEFAULTS[cat].name, hex: COLOR_DEFAULTS[cat].hex, image }],
    sizes,
    images: [image],
    tags: p.tags ?? [p.subcategory],
    occasion: p.occasion ?? 'everyday',
  };
}

export const INITIAL_PRODUCTS: Product[] = [
  // ── SHUDDHO — Food ──
  mk({
    name: 'Premium Miniket Rice (5 kg)',
    brand: 'SHUDDHO', category: 'food', subcategory: 'Rice & Staples', price: 620, originalPrice: 680, discountPercent: 9,
    description: 'Fragrant, polished Miniket rice — the everyday Bangladeshi staple. Clean, uniform grains that cook fluffy and light for bhat, polao and khichuri alike.',
    features: ['Unpolished aroma-grade Miniket', 'Low broken-grain ratio', 'Sourced from trusted local mills'],
    tags: ['rice', 'staple', 'miniket'], isBestSeller: true, isTrending: true, featuredOrder: 1,
  }),
  mk({
    name: 'Chinigura Fine Aromatic Rice (1 kg)',
    brand: 'SHUDDHO', category: 'food', subcategory: 'Rice & Staples', price: 420,
    description: 'Short-grain fragrant Chinigura rice, prized for festive biryani and bhat. Naturally aromatic with a soft, delicate texture.',
    features: ['Fine aromatic grain', 'Perfect for biryani & polao', 'Hand-sorted quality'],
    tags: ['chinigura', 'aromatic rice', 'biryani'], isNewArrival: true, featuredOrder: 2,
  }),
  mk({
    name: 'Kachi Ghee (500 g)',
    brand: 'SHUDDHO', category: 'food', subcategory: 'Oils & Ghee', price: 720, originalPrice: 780, discountPercent: 8,
    description: 'Slow-clarified deshi ghee from pure dairy cream. Golden, aromatic and rich — ideal for polao, shemai and traditional sweets.',
    features: ['Slow-clarified pure cream ghee', 'Rich golden aroma', 'No added colour or preservatives'],
    tags: ['ghee', 'kachi ghee', 'oils'], isBestSeller: true, featuredOrder: 3,
  }),
  mk({
    name: 'Mustard Oil (1 L)',
    brand: 'SHUDDHO', category: 'food', subcategory: 'Oils & Ghee', price: 350,
    description: 'Cold-pressed kachu sorsher tel with a strong, pungent character — the classic taste of Bangladeshi cooking and pickles.',
    features: ['Cold-pressed first grade', 'Strong pungent aroma', 'Ideal for fish, bharta & pickles'],
    tags: ['mustard oil', 'sorsher tel', 'cooking oil'], isTrending: true, featuredOrder: 4,
  }),
  mk({
    name: 'Virgin Coconut Oil (500 ml)',
    brand: 'SHUDDHO', category: 'food', subcategory: 'Oils & Ghee', price: 380,
    description: 'Cold-pressed virgin coconut oil for cooking, skin and hair use. Clean, mildly sweet and free from refinement.',
    features: ['Cold-pressed virgin quality', 'Multi-purpose: cook, skin, hair', 'Unrefined and unfiltered'],
    tags: ['coconut oil', 'narikel tel', 'oil'], featuredOrder: 5,
  }),
  mk({
    name: 'Masoor Dal (1 kg)',
    brand: 'SHUDDHO', category: 'food', subcategory: 'Dal & Pulses', price: 180,
    description: 'Clean, debris-free red lentil that cooks quickly into creamy dal. A protein-packed pantry essential for every Bangladeshi kitchen.',
    features: ['Even-size red lentils', 'Fast cooking', 'Double-sifted, stone-free'],
    tags: ['masoor dal', 'dal', 'lentil'], isNewArrival: true, featuredOrder: 6,
  }),
mk({
    name: 'Chola & Moshur Dal Combo (2×1 kg)',
    brand: 'SHUDDHO', category: 'food', subcategory: 'Dal & Pulses', price: 460, originalPrice: 500, discountPercent: 8,
    description: 'A practical two-pack of rosted chola (bengal gram) and moshur (red lentil) dal for daily protein-rich meals.',
    features: ['Two dals in one pack', 'High-protein source', 'Hygienically packed'],
    tags: ['dal', 'chola', 'moshur'], featuredOrder: 7,
  }),
  mk({
    name: 'Premium Whole Spice Set (6 jars)',
    brand: 'SHUDDHO', category: 'food', subcategory: 'Spices', price: 990, originalPrice: 1120, discountPercent: 12,
    description: 'Six aromatic whole spices — cinnamon, cardamom, cloves, bay leaves, black pepper and cumin — in airtight jars for daily cooking.',
    features: ['6 essential whole spices', 'Airtight storage jars', 'Freshly packed'],
    tags: ['spices', 'mosla', 'whole spices'], isBestSeller: true, featuredOrder: 8,
  }),
  mk({
    name: 'Pure Turmeric Powder (250 g)',
    brand: 'SHUDDHO', category: 'food', subcategory: 'Spices', price: 140,
    description: 'Sun-dried, stone-ground turmeric powder with deep natural colour and aroma. No artificial colour added.',
    features: ['Stone-ground pure holud', 'Vibrant natural colour', 'No artificial additives'],
    tags: ['turmeric', 'holud', 'spice'], featuredOrder: 9,
  }),
  mk({
    name: 'Pure Forest Honey (500 g)',
    brand: 'SHUDDHO', category: 'food', subcategory: 'Honey & Sweet', price: 850, originalPrice: 920, discountPercent: 8,
    description: 'Raw multi-flora forest honey with a thick texture and rich floral aroma. Unheated and unblended.',
    features: ['Raw forest honey', 'Unheated, unblended', 'Ideal with roti, gur and tea'],
    tags: ['honey', 'mou', 'natural'], isTrending: true, featuredOrder: 10,
  }),
  mk({
    name: 'Gorer Jhol Mixed Fruit Pickle (500 g)',
    brand: 'SHUDDHO', category: 'food', subcategory: 'Pickles & Traditional', price: 290,
    description: 'Homestyle mixed fruit achar in mustard oil — tangy, spicy and irresistibly good with khichuri and paratha.',
    features: ['Sun-ripened mixed fruit', 'Slow-cooked in mustard oil', 'Traditional gorer jhol recipe'],
    tags: ['pickle', 'achar', 'traditional'], featuredOrder: 11,
  }),
  mk({
    name: 'Dry Date & Nut Mix (400 g)',
    brand: 'SHUDDHO', category: 'food', subcategory: 'Dry Food & Essentials', price: 560,
    description: 'A wholesome mix of dried dates, almonds, cashews and raisins — a nutritious energy-rich snack for the whole family.',
    features: ['Dates + 3 nut varieties', 'No added sugar', 'Re-sealable pack'],
    tags: ['dry food', 'nuts', 'dates', 'snack'], isNewArrival: true, featuredOrder: 12,
  }),

  // ── AKS CRAFT — Handicrafts ──
  mk({
    name: 'Handcrafted Nakshi Kantha Throw',
    brand: 'AKS CRAFT', category: 'craft', subcategory: 'Nakshi Kantha', price: 2450, originalPrice: 2750, discountPercent: 11,
    description: 'A hand-stitched Nakshi Kantha throw styled with traditional motifs of lotus, birds and vines by Bangladeshi nakshi artisans.',
    features: ['Hand-stitched by local artisans', 'Traditional nakshi motifs', 'Soft cotton layering'],
    tags: ['nakshi kantha', 'kantha', 'handmade'], isBestSeller: true, featuredOrder: 13,
  }),
  mk({
    name: 'Heritage Paposh (Wedding Mat)',
    brand: 'AKS CRAFT', category: 'craft', subcategory: 'Paposh & Shotoronji', price: 3850, originalPrice: 4200, discountPercent: 8,
    description: 'A woven decorative paposh (kholsi) with geometric folk patterns — the traditional floor mat for weddings and festivals.',
    features: ['Traditional wedding kholsi', 'Folk geometric patterns', 'Durable woven construction'],
    tags: ['paposh', 'kholsi', 'wedding'], featuredOrder: 14,
  }),
  mk({
    name: 'Woven Shotoronji Mat (6×4 ft)',
    brand: 'AKS CRAFT', category: 'craft', subcategory: 'Paposh & Shotoronji', price: 2900,
    description: 'Brightly patterned shital pati shotoronji from traditional weaving villages. Cool, flexible and ideal for floor seating.',
    features: ['Traditional shital pati weave', 'Cool & flexible', 'Hand-dyed colours'],
    tags: ['shotoronji', 'shital pati', 'mat'], isNewArrival: true, featuredOrder: 15,
  }),
mk({
    name: 'Jute Shopping Tote',
    brand: 'AKS CRAFT', category: 'craft', subcategory: 'Jute Products', price: 650, originalPrice: 720, discountPercent: 10,
    description: 'A sturdy everyday with a woven jute shopping tote — eco-friendly, spacious and finished with cotton handles.',
    features: ['Eco-friendly woven jute', 'Spacious 40cm carry bag', 'Cotton stitched handles'],
    tags: ['jute', 'tote', 'eco'], isBestSeller: true, isTrending: true, featuredOrder: 16,
  }),
  mk({
    name: 'Jute Storage Basket (Set of 2)',
    brand: 'AKS CRAFT', category: 'craft', subcategory: 'Jute Products', price: 980,
    description: 'Two neatly woven jute storage baskets with rope handles — perfect for organizing shelves, toys, or fabric.',
    features: ['Set of two sizes', 'Reinforced rope handles', 'Woven natural jute'],
    tags: ['jute', 'basket', 'storage'], featuredOrder: 17,
  }),
  mk({
    name: 'Bamboo Serving Tray',
    brand: 'AKS CRAFT', category: 'craft', subcategory: 'Bamboo Products', price: 750,
    description: 'A smooth, food-safe bamboo serving tray with raised edges — ideal for tea, snacks or breakfast in bed.',
    features: ['Food-safe natural bamboo', 'Hand-finished smooth surface', 'Raised edge design'],
    tags: ['bamboo', 'tray', 'serving'], isNewArrival: true, featuredOrder: 18,
  }),
  mk({
    name: 'Bamboo Wall Art Panel',
    brand: 'AKS CRAFT', category: 'craft', subcategory: 'Bamboo Products', price: 1150,
    description: 'A hand-assembled bamboo wall panel with layered weave texture, adding a natural focal point to any room.',
    features: ['Layered bamboo weave', 'Easy to mount', 'Natural warm tone'],
    tags: ['bamboo', 'wall art', 'décor'], featuredOrder: 19,
  }),
  mk({
    name: 'Terracotta Flower Pot Set (3 pcs)',
    brand: 'AKS CRAFT', category: 'craft', subcategory: 'Handmade Décor', price: 1250,
    description: 'Three hand-thrown terracotta pots in graduated sizes, made by traditional clay artisans. Great on a balcony or sill.',
    features: ['Hand-thrown terracotta', '3 graduated sizes', 'Breathable natural clay'],
    tags: ['terracotta', 'pot', 'clay'], featuredOrder: 20,
  }),
  mk({
    name: 'Hand-Painted Canvas Décor',
    brand: 'AKS CRAFT', category: 'craft', subcategory: 'Handmade Décor', price: 1550,
    description: 'An original hand-painted canvas panel with folk tree-of-life art. Ready to hang with wooden frame.',
    features: ['Original folk painting', 'Ready-to-hang frame', 'Acrylic on canvas'],
    tags: ['canvas', 'folk art', 'painting'], featuredOrder: 21,
  }),
  mk({
    name: 'Traditional Nakshi Kantha Pillow Cover',
    brand: 'AKS CRAFT', category: 'craft', subcategory: 'Nakshi Kantha', price: 850,
    description: 'A cushion-sized nakshi kantha cover stitched with running-stitch motifs — hand-embroidered, one-of-a-kind.',
    features: ['Hand embroidered kantha', 'Running-stitch motifs', 'Cushion (16") size'],
    tags: ['nakshi kantha', 'cushion', 'handmade'], featuredOrder: 22,
  }),
  mk({
    name: 'Handwoven Jute Carpet (6×4 ft)',
    brand: 'AKS CRAFT', category: 'craft', subcategory: 'Jute Products', price: 3400, originalPrice: 3600, discountPercent: 6,
    description: 'A thick handwoven jute carpet with a soft neutral tone that ties a natural room together.',
    features: ['Thick handwoven pile', 'Natural sand tone', '100% jute fibre'],
    tags: ['jute carpet', 'rug', 'handwoven'], featuredOrder: 23,
  }),
  mk({
    name: 'Artisan Gift Wrapping Set',
    brand: 'AKS CRAFT', category: 'craft', subcategory: 'Handmade Décor', price: 620,
    description: 'Handmade wrapping paper, jute twine and a woven tag in one set — for gifts with an artisanal touch.',
    features: ['Handmade wrap paper', 'Jute twine + tag', 'Eco-friendly finish'],
    tags: ['gift wrap', 'jute', 'artisan'], isNewArrival: true, featuredOrder: 24,
  }),

  // ── AKS HOME — Home & Living ──
  mk({
    name: 'Premium Cotton Bedsheet (King)',
    brand: 'AKS HOME', category: 'home', subcategory: 'Bedding & Linens', price: 1850, originalPrice: 2050, discountPercent: 10,
    description: 'A 180 TC brushed cotton king bedsheet with a soft, breathable weave and relaxed, lived-in comfort.',
    features: ['180 TC smooth cotton', 'Soft, breathable finish', 'Fits king beds'],
    tags: ['bedsheet', 'bedding', 'cotton'], isBestSeller: true, isTrending: true, featuredOrder: 25,
  }),
  mk({
    name: 'Soft Bed Cover Set (Queen)',
    brand: 'AKS HOME', category: 'home', subcategory: 'Bedding & Linens', price: 2400, originalPrice: 2600, discountPercent: 8,
    description: 'A complete queen bed cover set with 2 pillow covers in a premium washed-cotton finish.',
    features: ['Washed cotton finish', 'Set with 2 pillow covers', 'Breathable and light'],
    tags: ['bed cover', 'bedding', 'cotton'], featuredOrder: 26,
  }),
  mk({
    name: 'Pillow Cover Set (4 pcs)',
    brand: 'AKS HOME', category: 'home', subcategory: 'Bedding & Linens', price: 720,
    description: 'Four soft cotton pillow covers in a tone-on-tone design — an easy refresh for any bedroom.',
    features: ['4 cotton covers', 'Tone-on-tone weave', 'Hidden zip closure'],
    tags: ['pillow cover', 'bedding'], isNewArrival: true, featuredOrder: 27,
  }),
mk({
    name: 'Blackout Curtain Pair (90")',
    brand: 'AKS HOME', category: 'home', subcategory: 'Curtains & Drapery', price: 1690, originalPrice: 1850, discountPercent: 9,
    description: 'A blackout-lined curtain pair that blocks light, softens noise and keeps rooms cooler in the afternoon.',
    features: ['Blackout lining', 'Pair of 2 panels', 'Heat & light blocking'],
    tags: ['curtain', 'blackout', 'drapery'], isBestSeller: true, featuredOrder: 28,
  }),
  mk({
    name: 'Decorative Cushion Cover Set',
    brand: 'AKS HOME', category: 'home', subcategory: 'Cushions & Carpets', price: 850,
    description: 'Two printed cushion covers in a coordinated pattern set — quick styling for sofa and bed.',
    features: ['Set of 2 covers', 'Fade-resistant print', '18" square'],
    tags: ['cushion', 'cushion cover', 'décor'], featuredOrder: 29,
  }),
  mk({
    name: 'Cotton Cushion Insert (Set of 2)',
    brand: 'AKS HOME', category: 'home', subcategory: 'Cushions & Carpets', price: 940,
    description: 'Two plump cotton-filled cushion inserts, ready to slip into your favourite covers.',
    features: ['2 cotton inserts', '18" square', 'Machine washable shell'],
    tags: ['cushion', 'insert', 'cotton'], isNewArrival: true, featuredOrder: 30,
  }),
  mk({
    name: 'Jute Carpet Rug (6×4 ft)',
    brand: 'AKS HOME', category: 'home', subcategory: 'Cushions & Carpets', price: 2950,
    description: 'A naturally textured jute rug that grounds the living area with a warm, handwoven look.',
    features: ['Natural jute weave', '6x4 ft area rug', 'Non-slip backing'],
    tags: ['carpet', 'rug', 'jute'], featuredOrder: 31,
  }),
  mk({
    name: 'Kitchen Utensil Starter Set',
    brand: 'AKS HOME', category: 'home', subcategory: 'Kitchen Essentials', price: 1150,
    description: 'An everyday starter set of durable kitchen utensils — spoon, ladle, turner, whisk and more, with hanging loops.',
    features: ['8 essential tools', 'Food-safe stainless steel', 'Hanging loop handles'],
    tags: ['kitchen', 'utensils', 'cookware'], featuredOrder: 32,
  }),
  mk({
    name: 'Stainless Cookware Set (3 pc)',
    brand: 'AKS HOME', category: 'home', subcategory: 'Kitchen Essentials', price: 3200, originalPrice: 3500, discountPercent: 9,
    description: 'A three-piece stainless steel cookware set with tight-fitting lids and stay-cool handles.',
    features: ['3-pc pot + pan + lid', 'Stay-cool handles', 'Dishwasher safe'],
    tags: ['cookware', 'stainless', 'kitchen'], featuredOrder: 33,
  }),
  mk({
    name: 'Under-Bed Storage Boxes (Set of 3)',
    brand: 'AKS HOME', category: 'home', subcategory: 'Storage & Organization', price: 1290,
    description: 'Foldable under-bed storage boxes with clear windows and zips — smart space-saving for bedding and off-season items.',
    features: ['Set of 3 boxes', 'Clear viewing window', 'Foldable when unused'],
    tags: ['storage', 'organization', 'boxes'], featuredOrder: 34,
  }),
  mk({
    name: 'Wall-Mounted Home Décor Set',
    brand: 'AKS HOME', category: 'home', subcategory: 'Home Décor', price: 1650,
    description: 'A curated trio of wall-mounted décor pieces — woven metal and wood accents that add warmth to any wall.',
    features: ['Set of 3 pieces', 'Mixed wood & metal', 'Easy mount kit'],
    tags: ['wall décor', 'home décor', 'wall art'], isNewArrival: true, featuredOrder: 35,
  }),
  mk({
    name: 'Cotton Duvet Cover',
    brand: 'AKS HOME', category: 'home', subcategory: 'Bedding & Linens', price: 2150, originalPrice: 2350, discountPercent: 8,
    description: 'A lightweight cotton duvet cover with corner ties, offering a clean layered look with any quilt.',
    features: ['Combed cotton shell', 'Corner ties included', 'Queen/King fit'],
    tags: ['duvet', 'bedding', 'cotton'], featuredOrder: 36,
  }),

  // ── AKS BEAUTY — Personal Care ──
  mk({
    name: 'Herbal Glycerine Soap (4 pack)',
    brand: 'AKS BEAUTY', category: 'beauty', subcategory: 'Soap & Body Care', price: 320,
    description: 'Four glycerine-rich herbal soaps that cleanse gently, leaving skin soft and lightly scented.',
    features: ['Glycerine rich formula', '4 soap bars', 'Gentle daily cleanse'],
    tags: ['soap', 'body care', 'herbal'], isBestSeller: true, featuredOrder: 37,
  }),
  mk({
    name: 'Neem & Tulsi Soap (6 pack)',
    brand: 'AKS BEAUTY', category: 'beauty', subcategory: 'Soap & Body Care', price: 380, originalPrice: 420, discountPercent: 10,
    description: 'Six herbal soaps with neem and tulsi extracts — a fresh, clarifying daily bar for oily and combination skin.',
    features: ['Neem + tulsi extracts', '6 soap bars', 'Clarifying cleanser'],
    tags: ['soap', 'neem', 'tulsi'], featuredOrder: 38,
  }),
  mk({
    name: 'Premium Nourishing Shampoo (350 ml)',
    brand: 'AKS BEAUTY', category: 'beauty', subcategory: 'Hair Care', price: 480,
    description: 'A mild, sulphate-free shampoo that cleanses gently while softening hair, with a subtle morning scent.',
    features: ['Sulphate-free cleanser', 'Softens & detangles', '350 ml bottle'],
    tags: ['shampoo', 'hair care'], isTrending: true, featuredOrder: 39,
  }),
mk({
    name: 'Cold-Pressed Coconut Hair Oil (200 ml)',
    brand: 'AKS BEAUTY', category: 'beauty', subcategory: 'Hair Care', price: 350,
    description: 'Pure coconut oil pressed without heat for regular hair massage, taming frizz and adding shine.',
    features: ['Cold-pressed pure oil', 'Adds shine & softness', '200 ml dropper bottle'],
    tags: ['hair oil', 'coconut oil', 'hair care'], featuredOrder: 40,
  }),
  mk({
    name: 'Aloe Vera Face Wash (150 ml)',
    brand: 'AKS BEAUTY', category: 'beauty', subcategory: 'Face Care', price: 420, originalPrice: 460, discountPercent: 9,
    description: 'A gentle aloe-based foaming face wash that refreshes skin and helps remove the day’s dirt without over-stripping.',
    features: ['Aloe extract base', 'Gentle daily foam', '150 ml pump'],
    tags: ['face wash', 'aloe', 'skincare'], isBestSeller: true, featuredOrder: 41,
  }),
  mk({
    name: 'Daily Moisturizing Lotion (200 ml)',
    brand: 'AKS BEAUTY', category: 'beauty', subcategory: 'Face Care', price: 460,
    description: 'A fast-absorbing lightweight lotion for daily body and face hydration with a non-greasy finish.',
    features: ['Fast absorb finish', 'Daily hydration', '200 ml pump bottle'],
    tags: ['lotion', 'moisturizer', 'body care'], featuredOrder: 42,
  }),
  mk({
    name: 'Vitamin C Face Cream (50 g)',
    brand: 'AKS BEAUTY', category: 'beauty', subcategory: 'Face Care', price: 690, originalPrice: 750, discountPercent: 8,
    description: 'A refreshing vitamin C cream that brightens the look of tired skin while keeping it hydrated through the day.',
    features: ['Vitamin C enriched', 'Brightening hydration', '50 g jar'],
    tags: ['face cream', 'vitamin c', 'skincare'], isNewArrival: true, featuredOrder: 43,
  }),
  mk({
    name: 'Herbal Body Scrub (250 g)',
    brand: 'AKS BEAUTY', category: 'beauty', subcategory: 'Personal Care', price: 520,
    description: 'A sugar-and-herb body scrub that polishes skin and rinses clean, leaving a soft citrus scent.',
    features: ['Sugar granule texture', 'Herb + citrus scent', '250 g tub'],
    tags: ['body scrub', 'body care', 'exfoliate'], featuredOrder: 44,
  }),
  mk({
    name: 'Lip Balm Duo (2 pcs)',
    brand: 'AKS BEAUTY', category: 'beauty', subcategory: 'Personal Care', price: 290,
    description: 'Two nourishing lip balms with shea and vitamin E for everyday softness and light tint.',
    features: ['Shea + vitamin E', '2 balms in set', 'Subtle natural tint'],
    tags: ['lip balm', 'personal care'], featuredOrder: 45,
  }),
  mk({
    name: 'Hair Serum Gloss Drops (100 ml)',
    brand: 'AKS BEAUTY', category: 'beauty', subcategory: 'Hair Care', price: 540,
    description: 'Lightweight gloss drops that smooth flyaways and add a mirror-like finish after styling.',
    features: ['Lightweight shine', 'Frizz control', '100 ml dropper'],
    tags: ['hair serum', 'hair care', 'gloss'], isNewArrival: true, featuredOrder: 46,
  }),
  mk({
    name: 'Beauty Essentials Gift Box',
    brand: 'AKS BEAUTY', category: 'beauty', subcategory: 'Beauty Accessories', price: 1250, originalPrice: 1350, discountPercent: 7,
    description: 'A ready-to-gift box with soap, lotion, lip balm and a hair accessory in a keepsake cotton pouch.',
    features: ['4 curated items', 'Keepsake cotton pouch', 'Gift-ready box'],
    tags: ['gift box', 'beauty set'], featuredOrder: 47,
  }),
  mk({
    name: 'Bamboo Beauty Accessory Set',
    brand: 'AKS BEAUTY', category: 'beauty', subcategory: 'Beauty Accessories', price: 480,
    description: 'A bamboo-finished set of mirror, comb and brush — practical, eco-conscious everyday beauty tools.',
    features: ['Bamboo handles', 'Mirror + comb + brush', 'Eco-friendly finish'],
    tags: ['accessory', 'bamboo', 'beauty tools'], featuredOrder: 48,
  }),
// ── AKS PRINT — Custom Printing ──
  mk({
    name: 'Custom Printed T-Shirt',
    brand: 'AKS PRINT', category: 'print', subcategory: 'Custom Apparel', price: 650,
    description: 'A soft cotton unisex t-shirt with your design screen or DTG printed in crisp colours. Reply with your art or choose from stock layouts.',
    features: ['100% combed cotton', 'Flat or DTG printing', 'Unisex S–XXL'],
    fit: 'Regular Fit', pattern: 'Printed', sleeve: 'Half Sleeve', sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    tags: ['t-shirt', 'custom print', 'apparel'], isBestSeller: true, isTrending: true, featuredOrder: 49,
  }),
  mk({
    name: 'Custom Mug Print (11 oz)',
    brand: 'AKS PRINT', category: 'print', subcategory: 'Mugs & Drinkware', price: 390,
    description: 'A glossy 11 oz mug printed with your photo, logo or message on both sides. Dishwasher-safe sublimation print.',
    features: ['11 oz gloss ceramic', 'Full-colour sublimation', 'Photo / logo / text'],
    tags: ['mug', 'custom print', 'drinkware'], featuredOrder: 50,
  }),
  mk({
    name: 'Premium Business Cards (100 pcs)',
    brand: 'AKS PRINT', category: 'print', subcategory: 'Cards & Stationery', price: 850, originalPrice: 950, discountPercent: 11,
    description: '350 gsm matt or gloss business cards with single- or double-side print and rounded or square corners.',
    features: ['350 gsm premium stock', 'Single/double side', 'Free design template'],
    tags: ['business card', 'stationery', 'print'], featuredOrder: 51,
  }),
  mk({
    name: 'Premium Poster Print (A2)',
    brand: 'AKS PRINT', category: 'print', subcategory: 'Posters & Signage', price: 520,
    description: 'A vivid A2 poster on glossy photo stock — great for promotions, events and wall art.',
    features: ['A2 gloss photo stock', 'High-resolution print', 'Ready to frame'],
    tags: ['poster', 'print', 'signage'], featuredOrder: 52,
  }),
  mk({
    name: 'Flyer Print (1000 pcs, A5)',
    brand: 'AKS PRINT', category: 'print', subcategory: 'Posters & Signage', price: 1800,
    description: 'Colourful A5 flyers on 150 gsm stock, single-side — ideal for campaigns, menus and promotions.',
    features: ['150 gsm A5', 'Full-colour print', '1000 pcs one-side'],
    tags: ['flyer', 'leaflet', 'print'], isNewArrival: true, featuredOrder: 53,
  }),
  mk({
    name: 'Sticker Print Pack (50 pcs)',
    brand: 'AKS PRINT', category: 'print', subcategory: 'Cards & Stationery', price: 420,
    description: 'Die-cut or rectangular stickers on vinyl with a protective laminate — perfect for branding and packaging.',
    features: ['Vinyl + gloss laminate', 'Die-cut available', '50 pcs pack'],
    tags: ['sticker', 'vinyl', 'print'], featuredOrder: 54,
  }),
mk({
    name: 'Wedding Invitation Card (50 pcs)',
    brand: 'AKS PRINT', category: 'print', subcategory: 'Cards & Stationery', price: 2200, originalPrice: 2400, discountPercent: 8,
    description: 'Elegant 300 gsm invitation cards printed with gold-foil accents and matching envelopes.',
    features: ['300 gsm textured card', 'Foil accent options', '50 pcs + envelopes'],
    tags: ['invitation', 'wedding', 'cards'], featuredOrder: 55,
  }),
  mk({
    name: 'Custom Gift Print Set',
    brand: 'AKS PRINT', category: 'print', subcategory: 'Custom Design', price: 990,
    description: 'A coordinated gift print set — wrap paper, gift tags and a small box, all printed with your message or monogram.',
    features: ['Matching gift set', 'Your design/logo', 'Quality kraft finish'],
    tags: ['gift', 'custom', 'print'], isNewArrival: true, featuredOrder: 56,
  }),
  mk({
    name: 'Corporate Letterhead Pack (100 pcs)',
    brand: 'AKS PRINT', category: 'print', subcategory: 'Corporate & Packaging', price: 1600,
    description: 'Watermark-printed A4 letterheads in 120 gsm bond paper — a professional touch for corporate correspondence.',
    features: ['120 gsm bond paper', 'Watermark option', '100 pcs pack'],
    tags: ['letterhead', 'corporate', 'stationery'], featuredOrder: 57,
  }),
  mk({
    name: 'Custom Printed Cap',
    brand: 'AKS PRINT', category: 'print', subcategory: 'Custom Apparel', price: 480,
    description: 'A structured cotton cap embroidered or printed with your logo or text, in any colourway.',
    features: ['Structured cotton cap', 'Embroidery or print', 'One adjustable size'],
    sizes: ['One Size'],
    tags: ['cap', 'custom', 'promo'], featuredOrder: 58,
  }),
  mk({
    name: 'Packaging Box Print (50 pcs)',
    brand: 'AKS PRINT', category: 'print', subcategory: 'Corporate & Packaging', price: 2400, originalPrice: 2600, discountPercent: 8,
    description: 'Custom printed kraft mailer boxes with your branding — ready for e-commerce dispatch.',
    features: ['Kraft mailer box', 'Full-brand print', '50 pcs'],
    tags: ['packaging', 'box', 'branding'], featuredOrder: 59,
  }),
  mk({
    name: 'Complete Design & Print Bundle',
    brand: 'AKS PRINT', category: 'print', subcategory: 'Custom Design', price: 4500,
    description: 'A design-to-print bundle: professional artwork setup plus your choice of cards, posters and stickers.',
    features: ['Design setup included', 'Cards + posters + stickers', 'Priority turnaround'],
    tags: ['design', 'bundle', 'print'], isBestSeller: true, featuredOrder: 60,
  }),
];

// ── Seed reviews for the new catalog ────────────────────────────────────────
// Placeholder seed content only — real reviews should come from customers via
// the admin panel. No "fit" feedback here: this catalog has no size-fitted apparel.
export const INITIAL_REVIEWS: Review[] = [
  {
    id: 'rev-akm-01', productId: 'akm-food-01', author: 'Rashed Karim', city: 'Dhaka', rating: 5,
    title: 'Fresh and fragrant', comment: 'Good aroma and very clean grain. Cooks soft and light — will reorder monthly.',
    date: '2026-08-01', verified: true, helpfulCount: 12,
  },
  {
    id: 'rev-akm-02', productId: 'akm-food-03', author: 'Nusrat Jahan', city: 'Chattogram', rating: 5,
    title: 'Golden and rich', comment: 'Pure deshi ghee taste. Used it in polao and shemai — family loved it.',
    date: '2026-08-03', verified: true, helpfulCount: 8,
  },
  {
    id: 'rev-akm-03', productId: 'akm-craft-01', author: 'Farhana Islam', city: 'Sylhet', rating: 5,
    title: 'Stunning kantha work', comment: 'The stitching detail is beautiful and the colours are even better in person. Gifted one to my mother.',
    date: '2026-08-05', verified: true, helpfulCount: 9,
  },
  {
    id: 'rev-akm-04', productId: 'akm-craft-04', author: 'Sajid Ahmed', city: 'Dhaka', rating: 4,
    title: 'Sturdy and stylish', comment: 'Great quality jute bag, strong handles. Perfect as an alternative to plastic.',
    date: '2026-08-06', verified: false, helpfulCount: 4,
  },
  {
    id: 'rev-akm-05', productId: 'akm-home-01', author: 'Tania Rahman', city: 'Rajshahi', rating: 5,
    title: 'Soft and breathable', comment: 'The bedsheet feels great and the size fits my king bed. Value for money.',
    date: '2026-08-07', verified: true, helpfulCount: 7,
  },
  {
    id: 'rev-akm-06', productId: 'akm-home-04', author: 'Momo Chowdhury', city: 'Dhaka', rating: 5,
    title: 'Blocks light perfectly', comment: 'Rooms feel much cooler and darker in the afternoon. Easy to install.',
    date: '2026-08-08', verified: true, helpfulCount: 6,
  },
  {
    id: 'rev-akm-07', productId: 'akm-beauty-07', author: 'Sabila Noor', city: 'Khulna', rating: 4,
    title: 'Gentle and soft', comment: 'Beautiful lip balm, keeps lips soft through the day. Nice natural tint.',
    date: '2026-08-09', verified: false, helpfulCount: 3,
  },
  {
    id: 'rev-akm-08', productId: 'akm-print-01', author: 'Arif Hossain', city: 'Dhaka', rating: 5,
    title: 'Print came out crisp', comment: 'Ordered for our team event. Colours are vivid and the fabric is comfortable.',
    date: '2026-08-10', verified: true, helpfulCount: 11,
  },
];