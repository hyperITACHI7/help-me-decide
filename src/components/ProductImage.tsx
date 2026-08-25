"use client";

import { handleImageError } from "@/lib/imageFallback";

/**
 * A plain <img> with the CDN-failure fallback wired in — exists because event
 * handlers can't be passed to a DOM element from a Server Component, and some
 * product photos (e.g. the triage summary page) render from one.
 */
export function ProductImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- hotlinked photo
    <img src={src} alt={alt} className={className} onError={handleImageError} />
  );
}
