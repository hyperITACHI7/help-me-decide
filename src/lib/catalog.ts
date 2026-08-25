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
// Matches the "large" catalog's -v0/-v1/-v2 colourway suffix, capturing the
// index so each variant can get its own distinct photo (see PRODUCT_PHOTOS)
// rather than all three sharing one shot.
const VARIANT_SUFFIX = /-v(\d+)$/;

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

// Hand-picked, hand-verified photos, sourced from Pinterest after LoremFlickr's
// tag search proved too unreliable (see PRODUCT_KEYWORDS above and the git
// history — it kept returning noise like an unrelated animal photo for a
// jacket). Each URL was resolved from the actual pin, not the pinterest.com
// share page, and confirmed to hotlink correctly from a third-party origin
// before being added here. Takes priority over PRODUCT_KEYWORDS below, which
// now only backstops any product this map doesn't cover.
//
// One entry per colourway variant, not one shared per base product: the
// "large" catalog shows a product's three variants (-v0/-v1/-v2) as three
// separate cards, and reusing a single photo across all three read as
// repetitive. Small-wishlist items (no variant suffix, only ever one card)
// just get a one-element array.
const PRODUCT_PHOTOS: Record<string, string[]> = {
  "urban-thread-olive-field-jacket": [
    "https://i.pinimg.com/736x/d2/79/46/d27946d5554525aa18cabed1bb04cbf7.jpg",
  ],
  "northgear-quilted-bomber": [
    "https://i.pinimg.com/736x/cf/3c/04/cf3c04ab79667ae54b56fcd378ad7c6d.jpg",
  ],
  "streetkraft-denim-trucker": [
    "https://i.pinimg.com/736x/4d/f5/2c/4df52ce873ba656773289c57c139cb4d.jpg",
  ],
  "cahoot-classic-shirt": [
    "https://i.pinimg.com/736x/7e/19/4f/7e194fc1448effdd0a3ee377a3808a44.jpg",
    "https://i.pinimg.com/736x/a0/9e/9c/a09e9c86f3ce51c34a32b2fbac0a0bd1.jpg",
    "https://i.pinimg.com/736x/ad/e9/f9/ade9f92a1faa26638b86a2f230aa2db4.jpg",
  ],
  "flexfit-crew-tee": [
    "https://i.pinimg.com/736x/4b/57/c5/4b57c5c29d10c4b0b878fc6d0026f1a6.jpg",
    "https://i.pinimg.com/736x/5a/76/a1/5a76a1d572fb4a202f9e074265a54df9.jpg",
    "https://i.pinimg.com/736x/c5/93/a5/c593a579c33ea8889b2ddb5b9a59aa2f.jpg",
  ],
  "strideone-running-shoes": [
    "https://i.pinimg.com/736x/62/10/94/621094187ce06e7465e1a7c37cda5d5b.jpg",
    "https://i.pinimg.com/736x/8e/7f/00/8e7f00f73e29c2d96d16279859141754.jpg",
    "https://i.pinimg.com/736x/55/c4/01/55c401b3860192fbe41504530dd3cc5a.jpg",
  ],
  "denimforge-slim-trouser": [
    "https://i.pinimg.com/736x/11/2b/cc/112bcc6a7975881ef40873b4d9fb4a44.jpg",
    "https://i.pinimg.com/736x/15/86/0e/15860e2d00d64a5fe24e4fbf29f57b4c.jpg",
    "https://i.pinimg.com/736x/da/dc/e5/dadce5946b733d5e9d00def3ec34f041.jpg",
  ],
  "urban-thread-hoodie": [
    "https://i.pinimg.com/736x/2e/04/ed/2e04ed6eac01f77c3f7faaf17fad12a4.jpg",
    "https://i.pinimg.com/736x/4e/06/89/4e068965c1ddd62562cee06af87a88ec.jpg",
    "https://i.pinimg.com/736x/d7/b4/a9/d7b4a9b448c509f2ffd9256e2b619f30.jpg",
  ],
  "cahoot-linen-shirt": [
    "https://i.pinimg.com/736x/01/c7/a9/01c7a9e6d6485b2be073a2b8d47ccaca.jpg",
    "https://i.pinimg.com/736x/a3/7f/e5/a37fe500edcdbc8dfab9d47e9c9325ae.jpg",
    "https://i.pinimg.com/736x/c6/f9/4f/c6f94f3c64c62702e7ef5a3c63ceb2be.jpg",
  ],
  "flexfit-polo": [
    "https://i.pinimg.com/736x/25/d1/b8/25d1b8d16537f27331eb43cbdb85985e.jpg",
    "https://i.pinimg.com/736x/96/7e/ed/967eedd51fb5d70ec23ae75a2667ea9d.jpg",
    "https://i.pinimg.com/736x/97/6a/ad/976aadd493ec3fb1e2c38c97fef57a19.jpg",
  ],
  "strideone-canvas-sneaker": [
    "https://i.pinimg.com/736x/95/a1/8c/95a18cb1540386ce3969132b98e98ae3.jpg",
    "https://i.pinimg.com/736x/9f/78/e4/9f78e4369d001ce65c644ba315e85667.jpg",
    "https://i.pinimg.com/736x/f2/a5/81/f2a581d98ad0c0d8495fa39aaa3747ac.jpg",
  ],
  "denimforge-cargo-trouser": [
    "https://i.pinimg.com/736x/7f/bc/ba/7fbcbaaa0a94e75e2a4df19550de339c.jpg",
    "https://i.pinimg.com/736x/a4/bb/92/a4bb923d4899e63f48003a198d4b7ce8.jpg",
    "https://i.pinimg.com/736x/84/94/a4/8494a416f5c6df1ea00562f06f790c65.jpg",
  ],
  "northgear-puffer-vest": [
    "https://i.pinimg.com/736x/a0/98/cb/a098cb51d493ec704baaa4d29ee17078.jpg",
    "https://i.pinimg.com/736x/6a/a9/22/6aa922e27619fafd7d03b93601aa12f4.jpg",
    "https://i.pinimg.com/736x/f2/02/23/f20223e27b5c61e790964e76da07695d.jpg",
  ],
  "cahoot-check-shirt": [
    "https://i.pinimg.com/736x/d8/53/5c/d8535c9a618b06cc07096516c614c4c1.jpg",
    "https://i.pinimg.com/736x/a1/17/b9/a117b9eb34e43ed7a1fad8ec86ffbde8.jpg",
    "https://i.pinimg.com/736x/e4/81/62/e4816295522a4dc032b97d105c4d761b.jpg",
  ],
  "flexfit-henley": [
    "https://i.pinimg.com/736x/22/5b/f5/225bf5adeda8882af84bb35cc741554e.jpg",
    "https://i.pinimg.com/736x/8d/ac/0c/8dac0cb36c401979ec79febe47b78cac.jpg",
    "https://i.pinimg.com/736x/51/61/cc/5161cc26a5dc457a161d606cae0e4e20.jpg",
  ],
  "strideone-trail-shoes": [
    "https://i.pinimg.com/736x/9c/64/a5/9c64a589878d81262468cbcbe82f1b88.jpg",
    "https://i.pinimg.com/736x/fe/46/6f/fe466f25a43ef3918fc17869c20ab8c7.jpg",
    "https://i.pinimg.com/736x/c3/6a/e5/c36ae511822a7a27afabf00f6ff779a2.jpg",
  ],
  "denimforge-jogger": [
    "https://i.pinimg.com/736x/31/33/97/313397f516bbe0e62532b15273e0a55e.jpg",
    "https://i.pinimg.com/736x/b9/c8/d7/b9c8d70c73d8154edfb6b9f2c05b79ec.jpg",
    "https://i.pinimg.com/736x/e3/39/80/e33980d2d4712359dc2d93a20b670a2f.jpg",
  ],
  "streetkraft-varsity-jacket": [
    "https://i.pinimg.com/736x/dc/ca/95/dcca95dab6cc885cfc229754d720a7f9.jpg",
    "https://i.pinimg.com/736x/8b/98/83/8b9883b764ed10289a228500a23355fb.jpg",
    "https://i.pinimg.com/736x/c3/b9/7c/c3b97ceb493d955f0b722b9299402b3e.jpg",
  ],
  "cahoot-oxford-shirt": [
    "https://i.pinimg.com/736x/a1/91/ac/a191ac220cb3fd6273f578fde1a3bd41.jpg",
    "https://i.pinimg.com/736x/a8/81/22/a88122811d4a290272cc1baad41735e3.jpg",
    "https://i.pinimg.com/736x/a0/00/ba/a000ba07cfb117bca41906783c85d9f6.jpg",
  ],
  "flexfit-oversized-tee": [
    "https://i.pinimg.com/736x/82/37/10/8237107d4225ec112b524f85094396f7.jpg",
    "https://i.pinimg.com/736x/39/37/b7/3937b7a8cca92b69cc81e46ac1e6af5b.jpg",
    "https://i.pinimg.com/736x/64/f8/63/64f86378dd580f60b45933ba0df3226b.jpg",
  ],
  "strideone-slip-on": [
    "https://i.pinimg.com/736x/63/93/20/6393202b8f0e1ec5a33b3594de9b97c4.jpg",
    "https://i.pinimg.com/736x/a2/55/95/a25595ba155c60fe71ce9ee2e71693f5.jpg",
    "https://i.pinimg.com/736x/4c/ec/a2/4ceca26f1fc5addf55292ae172e1ab50.jpg",
  ],
  "denimforge-formal-trouser": [
    "https://i.pinimg.com/736x/27/dd/c4/27ddc4e81c0035b75ee75d9eb9c86d9e.jpg",
    "https://i.pinimg.com/736x/43/b3/e8/43b3e8abb51e16d87531ff3018f43997.jpg",
    "https://i.pinimg.com/736x/15/9e/61/159e61c2b420ec73625d18f4b8dbb48e.jpg",
  ],
  "northgear-windbreaker": [
    "https://i.pinimg.com/736x/2d/7e/15/2d7e15c505acd623e399753646bf8e95.jpg",
    "https://i.pinimg.com/736x/bd/f6/de/bdf6de70886253a329d3b990093c0e08.jpg",
    "https://i.pinimg.com/736x/c2/8b/bc/c28bbc13140f1575c6e79d7f2fd91c6f.jpg",
  ],
};

export function imageUrlFor(slug: string): string {
  const variantMatch = slug.match(VARIANT_SUFFIX);
  const baseSlug = slug.replace(VARIANT_SUFFIX, "");
  const variantIndex = variantMatch ? Number(variantMatch[1]) : 0;

  const photos = PRODUCT_PHOTOS[baseSlug];
  if (photos) return photos[variantIndex % photos.length];

  const keyword = PRODUCT_KEYWORDS[baseSlug] ?? "clothing";
  const lock = hash(slug) % 10000;
  return `https://loremflickr.com/500/650/${keyword}?lock=${lock}`;
}
