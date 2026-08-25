/**
 * Product photos hotlink an external host (LoremFlickr — see catalog.ts's
 * imageUrlFor), which trades the old fully-local placeholder's guaranteed
 * availability for actually depicting the product. This is the neutral
 * placeholder a failed load degrades to — see ProductImage.tsx for how it's
 * actually wired in.
 */
const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="650" viewBox="0 0 500 650">
  <rect width="500" height="650" fill="#F1EAFB" />
  <g fill="#282C3F" fill-opacity="0.35">
    <rect x="200" y="260" width="100" height="80" rx="8" />
    <circle cx="250" cy="230" r="30" />
  </g>
</svg>`;

export const FALLBACK_IMAGE_SRC = `data:image/svg+xml;utf8,${encodeURIComponent(FALLBACK_SVG)}`;
