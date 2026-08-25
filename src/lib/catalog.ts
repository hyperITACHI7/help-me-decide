// Static seed catalog for the demo wishlist. There is no real Myntra
// integration (this is a standalone, seeded simulation — see
// phased_architecture.md §6.1), so every item's "revealed preference" count
// is synthetic by design, not fabricated live data.
//
// Deterministic on purpose: a simple string hash drives both the seeded
// open-count and the "large" variant's expansion, so re-seeding never
// reshuffles the sort order (edge_case.md EC3) and F8's two demo sizes stay
// reproducible across restarts.

export type CatalogItem = {
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  originalPrice?: number;
  rating: number;
  tags: string[];
  seededOpenCount: number;
};

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function openCountFor(slug: string, ceiling = 24): number {
  return hash(slug) % ceiling;
}

// The "small" variant: a deliberately hard three-way jacket decision —
// genuinely different tradeoffs (value / premium / trending), so the AI
// narrowing questions in Phase 3 have something real to work with.
const SMALL_BASE: Omit<CatalogItem, "seededOpenCount">[] = [
  {
    slug: "urban-thread-olive-field-jacket",
    name: "Urban Thread Olive Field Jacket",
    brand: "Urban Thread",
    category: "Jackets",
    price: 2199,
    originalPrice: 3999,
    rating: 4.1,
    tags: ["casual", "olive", "cotton", "streetwear"],
  },
  {
    slug: "northgear-quilted-bomber",
    name: "NorthGear Quilted Bomber Jacket",
    brand: "NorthGear",
    category: "Jackets",
    price: 4599,
    originalPrice: 6999,
    rating: 4.5,
    tags: ["premium", "black", "quilted", "winter"],
  },
  {
    slug: "streetkraft-denim-trucker",
    name: "StreetKraft Denim Trucker Jacket",
    brand: "StreetKraft",
    category: "Jackets",
    price: 1799,
    originalPrice: 2599,
    rating: 4.3,
    tags: ["trending", "denim", "blue", "casual"],
  },
];

// 20 hand-authored base templates spanning categories, each expanded into 3
// deterministic colour/price variants below to reach exactly 60 items for
// the "large" variant (F8's stress case).
const LARGE_TEMPLATES: Array<{
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  tags: string[];
}> = [
  { slug: "cahoot-classic-shirt", name: "CAHOOT Classic Self-Design Shirt", brand: "CAHOOT", category: "Shirts", price: 899, tags: ["formal", "cotton"] },
  { slug: "flexfit-crew-tee", name: "FlexFit Graphic Crew T-Shirt", brand: "FlexFit", category: "Tshirts", price: 549, tags: ["casual", "graphic-print"] },
  { slug: "strideone-running-shoes", name: "StrideOne Boost Running Shoes", brand: "StrideOne", category: "Sports Shoes", price: 2999, tags: ["sports", "running", "mesh"] },
  { slug: "denimforge-slim-trouser", name: "DenimForge Slim Fit Trouser", brand: "DenimForge", category: "Trousers", price: 1299, tags: ["formal", "slim-fit"] },
  { slug: "urban-thread-hoodie", name: "Urban Thread Fleece Hoodie", brand: "Urban Thread", category: "Jackets", price: 1599, tags: ["casual", "winter", "fleece"] },
  { slug: "cahoot-linen-shirt", name: "CAHOOT Linen Blend Shirt", brand: "CAHOOT", category: "Shirts", price: 1099, tags: ["summer", "linen", "casual"] },
  { slug: "flexfit-polo", name: "FlexFit Pique Polo T-Shirt", brand: "FlexFit", category: "Tshirts", price: 699, tags: ["smart-casual", "polo"] },
  { slug: "strideone-canvas-sneaker", name: "StrideOne Canvas Sneaker", brand: "StrideOne", category: "Sports Shoes", price: 1799, tags: ["casual", "canvas"] },
  { slug: "denimforge-cargo-trouser", name: "DenimForge Cargo Trouser", brand: "DenimForge", category: "Trousers", price: 1499, tags: ["casual", "cargo", "streetwear"] },
  { slug: "northgear-puffer-vest", name: "NorthGear Puffer Vest", brand: "NorthGear", category: "Jackets", price: 2299, tags: ["winter", "sleeveless"] },
  { slug: "cahoot-check-shirt", name: "CAHOOT Checked Flannel Shirt", brand: "CAHOOT", category: "Shirts", price: 999, tags: ["casual", "check-print", "winter"] },
  { slug: "flexfit-henley", name: "FlexFit Ribbed Henley Tee", brand: "FlexFit", category: "Tshirts", price: 649, tags: ["casual", "henley"] },
  { slug: "strideone-trail-shoes", name: "StrideOne Trail Grip Shoes", brand: "StrideOne", category: "Sports Shoes", price: 3299, tags: ["sports", "trail", "outdoor"] },
  { slug: "denimforge-jogger", name: "DenimForge Tapered Jogger", brand: "DenimForge", category: "Trousers", price: 1099, tags: ["casual", "jogger", "streetwear"] },
  { slug: "streetkraft-varsity-jacket", name: "StreetKraft Varsity Jacket", brand: "StreetKraft", category: "Jackets", price: 2799, tags: ["trending", "varsity", "streetwear"] },
  { slug: "cahoot-oxford-shirt", name: "CAHOOT Oxford Weave Shirt", brand: "CAHOOT", category: "Shirts", price: 1199, tags: ["formal", "oxford"] },
  { slug: "flexfit-oversized-tee", name: "FlexFit Oversized Tee", brand: "FlexFit", category: "Tshirts", price: 599, tags: ["trending", "oversized", "streetwear"] },
  { slug: "strideone-slip-on", name: "StrideOne Slip-On Loafers", brand: "StrideOne", category: "Sports Shoes", price: 1599, tags: ["casual", "slip-on"] },
  { slug: "denimforge-formal-trouser", name: "DenimForge Formal Flat-Front Trouser", brand: "DenimForge", category: "Trousers", price: 1699, tags: ["formal", "flat-front"] },
  { slug: "northgear-windbreaker", name: "NorthGear Packable Windbreaker", brand: "NorthGear", category: "Jackets", price: 1999, tags: ["sports", "lightweight", "rain-resistant"] },
];

const VARIANT_SUFFIXES = [
  { label: "", priceDelta: 0 },
  { label: " — Charcoal Edit", priceDelta: 200 },
  { label: " — Summer Colourway", priceDelta: -150 },
];

function buildLargeCatalog(): Omit<CatalogItem, "seededOpenCount">[] {
  const items: Omit<CatalogItem, "seededOpenCount">[] = [];
  for (const template of LARGE_TEMPLATES) {
    VARIANT_SUFFIXES.forEach((variant, i) => {
      const price = template.price + variant.priceDelta;
      // Varied per item (20-70%), not a flat multiplier — a constant discount
      // across every item would make the discount-range filter meaningless.
      const discountPct = 20 + (hash(`${template.slug}-v${i}-disc`) % 51);
      items.push({
        slug: `${template.slug}-v${i}`,
        name: `${template.name}${variant.label}`,
        brand: template.brand,
        category: template.category,
        price,
        originalPrice: Math.round(price / (1 - discountPct / 100)),
        rating: 3.6 + (hash(template.slug + i) % 14) / 10,
        tags: template.tags,
      });
    });
  }
  return items;
}

function withOpenCounts(
  items: Omit<CatalogItem, "seededOpenCount">[]
): CatalogItem[] {
  return items.map((item) => ({
    ...item,
    seededOpenCount: openCountFor(item.slug),
  }));
}

export const SMALL_WISHLIST: CatalogItem[] = withOpenCounts(SMALL_BASE);
export const LARGE_WISHLIST: CatalogItem[] = withOpenCounts(buildLargeCatalog());

export function catalogFor(variant: "small" | "large"): CatalogItem[] {
  return variant === "small" ? SMALL_WISHLIST : LARGE_WISHLIST;
}

// Real product photos via LoremFlickr — keyword-searched Flickr photos,
// hotlinked, no API key required. Chosen over a random/generic placeholder
// host (e.g. Picsum) specifically so the image actually resembles the
// product's category instead of being arbitrary stock art. `?lock=N` pins one
// specific photo per product rather than rotating on every load — otherwise
// the same wishlist item would show a different photo on every page view.
//
// This does reintroduce a live third-party dependency the app had
// deliberately avoided (see the git history for why inline SVGs replaced an
// earlier external host): every <img> rendering a product photo pairs this
// with handleImageError (src/lib/imageFallback.ts) so an unreachable CDN
// degrades to a neutral placeholder instead of a broken-image icon.
//
// Variant SKUs (the "large" catalog's -v0/-v1/-v2 colourway suffixes) share
// their base product's photo rather than each getting a unique shot, matching
// how most real catalogs handle closely related SKUs when a colourway-
// specific photo isn't shot.
const VARIANT_SUFFIX = /-v\d+$/;

// Every value here was verified directly against LoremFlickr before being
// used (see conversation history) against two failure modes the first pass
// didn't check for:
//  1. Hyphenated multi-word "keywords" like "field-jacket" or "formal-shirt"
//     are not real Flickr tags. Flickr tags are single words, so these
//     silently matched nothing on that half of the query, leaving only
//     whatever generic modifier word was comma-joined next to it (e.g.
//     "black", "white", "mens") to drive the actual result — genuinely
//     unrelated photos (a black cat, for "bomber-jacket,black") are what
//     that failure mode looks like.
//  2. Even once a keyword resolves to real matches, a narrow/rare tag can
//     have a matching pool of only one or two photos, so different `lock`
//     values collapse onto the same handful of images. Confirmed
//     empirically: "bomber-jacket,black" repeated by lock 2130 within 5
//     samples; every keyword below returned 5 distinct photos across 5
//     sample locks. ("puffer-vest", "canvas-sneakers" and "henley-shirt"
//     failed that check and were replaced with a broader, verified term.)
const PRODUCT_KEYWORDS: Record<string, string> = {
  "urban-thread-olive-field-jacket": "jacket",
  "northgear-quilted-bomber": "bomberjacket",
  "streetkraft-denim-trucker": "denimjacket",
  "cahoot-classic-shirt": "shirt",
  "flexfit-crew-tee": "tshirt",
  "strideone-running-shoes": "runningshoes",
  "denimforge-slim-trouser": "trousers",
  "urban-thread-hoodie": "hoodie",
  "cahoot-linen-shirt": "shirt",
  "flexfit-polo": "poloshirt",
  "strideone-canvas-sneaker": "sneakers",
  "denimforge-cargo-trouser": "cargopants",
  "northgear-puffer-vest": "pufferjacket",
  "cahoot-check-shirt": "flannelshirt",
  "flexfit-henley": "shirt",
  "strideone-trail-shoes": "hikingboots",
  "denimforge-jogger": "joggers",
  "streetkraft-varsity-jacket": "varsityjacket",
  "cahoot-oxford-shirt": "oxfordshirt",
  "flexfit-oversized-tee": "tshirt",
  "strideone-slip-on": "loafers",
  "denimforge-formal-trouser": "chinos",
  "northgear-windbreaker": "windbreaker",
};

export function imageUrlFor(slug: string): string {
  const baseSlug = slug.replace(VARIANT_SUFFIX, "");
  const keyword = PRODUCT_KEYWORDS[baseSlug] ?? "clothing";
  const lock = hash(baseSlug) % 10000;
  return `https://loremflickr.com/500/650/${keyword}?lock=${lock}`;
}
