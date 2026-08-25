"use client";

import { useEffect, useRef, useState } from "react";
import { FALLBACK_IMAGE_SRC } from "@/lib/imageFallback";

/**
 * A product photo with a CDN-failure fallback. Two things that look like
 * over-engineering here are both fixes for bugs caught live, not
 * precautions:
 *
 * 1. State-based, not an onError handler that mutates img.src directly.
 *    Several callers (e.g. DirectionAwareHover, which re-renders on every
 *    mousemove for its tilt effect) re-render often enough that React resets
 *    a directly-mutated src back to the `src` prop before the fix is ever
 *    visible.
 *
 * 2. The mount-time complete/naturalWidth check. If the browser already has
 *    a URL cached as failed (a real case here: LoremFlickr occasionally
 *    fails a specific lock value outright), the image can finish loading —
 *    with naturalWidth 0 — before this render's onError listener attaches,
 *    so the event never fires at all. Caught live: a card stuck showing a
 *    broken image through a full dev-server restart, because onError was
 *    never the problem — it was never called.
 *
 * `erroredSrc` names which src most recently failed rather than a bare
 * boolean, so if `src` later changes to a different URL, the comparison
 * naturally stops matching and the new photo renders normally.
 */
export function ProductImage({
  src,
  alt,
  className,
  ...rest
}: React.ImgHTMLAttributes<HTMLImageElement> & { src: string; alt: string }) {
  const [erroredSrc, setErroredSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth === 0) {
      setErroredSrc(src);
    }
  }, [src]);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- hotlinked photo, next/image can't optimize a runtime-variable external host
    <img
      {...rest}
      ref={imgRef}
      src={erroredSrc === src ? FALLBACK_IMAGE_SRC : src}
      alt={alt}
      className={className}
      onError={() => setErroredSrc(src)}
    />
  );
}
