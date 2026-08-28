"use client";
import React, {
  useEffect,
  useRef,
  useState,
  createContext,
  useContext,
} from "react";
import {
  IconArrowNarrowLeft,
  IconArrowNarrowRight,
  IconX,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { ProductImage } from "@/components/ProductImage";
import { useOutsideClick } from "@/hooks/use-outside-click";

/**
 * Adapted from Aceternity's apple-cards-carousel. The motion is untouched —
 * same stagger, same layoutId expand into the modal, same blur-in on load.
 *
 * Changes from upstream, all forced:
 *  - `JSX.Element[]` -> `React.ReactNode[]`: React 19 dropped the global JSX
 *    namespace, so the upstream type doesn't compile here.
 *  - BlurImage delegates to ProductImage instead of rendering a raw <img> with
 *    next/image's ImageProps. Upstream spreads `fill` and `blurDataURL` onto a
 *    plain <img>, which React rejects as unknown DOM attributes; going through
 *    ProductImage also picks up the CDN-failure fallback these photos need.
 *  - Cards are ~40% smaller. Upstream's md:h-[40rem] is a full-page hero; these
 *    sit inside a wishlist panel. The size now matches the grid cards' 0.75
 *    aspect ratio so they read as the same cards, just bigger.
 */
const CARD_WIDTH_MOBILE = 240;
const CARD_WIDTH_DESKTOP = 312;

interface CarouselProps {
  items: React.ReactNode[];
  initialScroll?: number;
}

export type CardData = {
  src: string;
  title: string;
  category: string;
  /**
   * Extra line on the card face, under the title. Not upstream — added because
   * the reason a pick was made is the point of the feature, and burying it
   * behind a click would make the cards decorative.
   */
  subtitle?: React.ReactNode;
  content: React.ReactNode;
};

export const CarouselContext = createContext<{
  onCardClose: (index: number) => void;
  currentIndex: number;
}>({
  onCardClose: () => {},
  currentIndex: 0,
});

export const Carousel = ({ items, initialScroll = 0 }: CarouselProps) => {
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Declared above the effect that calls it: upstream has this below, which
  // the react-hooks/immutability rule rejects as use-before-declaration.
  const checkScrollability = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 0);
      // Sub-pixel widths make an exact comparison read as scrollable when it
      // isn't, which leaves the right arrow permanently enabled.
      setCanScrollRight(Math.ceil(scrollLeft) < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    if (carouselRef.current) {
      carouselRef.current.scrollLeft = initialScroll;
      checkScrollability();
    }
  }, [initialScroll]);

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  const handleCardClose = (index: number) => {
    if (carouselRef.current) {
      const cardWidth = isMobile() ? CARD_WIDTH_MOBILE : CARD_WIDTH_DESKTOP;
      const gap = isMobile() ? 4 : 8;
      const scrollPosition = (cardWidth + gap) * (index + 1);
      carouselRef.current.scrollTo({
        left: scrollPosition,
        behavior: "smooth",
      });
      setCurrentIndex(index);
    }
  };

  const isMobile = () => {
    return window && window.innerWidth < 768;
  };

  return (
    <CarouselContext.Provider
      value={{ onCardClose: handleCardClose, currentIndex }}
    >
      <div className="relative w-full">
        <div
          className="flex w-full overflow-x-scroll overscroll-x-auto scroll-smooth py-4 [scrollbar-width:none]"
          ref={carouselRef}
          onScroll={checkScrollability}
        >
          <div className={cn("flex flex-row justify-start gap-4 pl-1")}>
            {items.map((item, index) => (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.5,
                    delay: 0.2 * index,
                    ease: "easeOut",
                  },
                }}
                key={"card" + index}
                className="rounded-3xl last:pr-[5%]"
              >
                {item}
              </motion.div>
            ))}
          </div>
        </div>
        {/* Three picks fit on a desktop row, which left both arrows permanently
            disabled — dead controls that only read as broken. */}
        <div
          className={cn(
            "mr-1 flex justify-end gap-2",
            !canScrollLeft && !canScrollRight && "hidden",
          )}
        >
          <button
            type="button"
            aria-label="Scroll picks left"
            className="relative z-40 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-canvas disabled:opacity-40"
            onClick={scrollLeft}
            disabled={!canScrollLeft}
          >
            <IconArrowNarrowLeft className="h-5 w-5 text-muted" />
          </button>
          <button
            type="button"
            aria-label="Scroll picks right"
            className="relative z-40 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-canvas disabled:opacity-40"
            onClick={scrollRight}
            disabled={!canScrollRight}
          >
            <IconArrowNarrowRight className="h-5 w-5 text-muted" />
          </button>
        </div>
      </div>
    </CarouselContext.Provider>
  );
};

export const Card = ({
  card,
  index,
  layout = false,
}: {
  card: CardData;
  index: number;
  layout?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { onCardClose } = useContext(CarouselContext);

  const handleClose = () => {
    setOpen(false);
    onCardClose(index);
  };

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") handleClose();
    }

    // Only touched while a card is actually open, so mounting three closed
    // cards no longer clobbers the page's scroll state three times over.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleClose is recreated every render; the effect only needs to re-run on open/close
  }, [open]);

  useOutsideClick(containerRef, () => handleClose());

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 h-screen overflow-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 h-full w-full bg-black/80 backdrop-blur-lg"
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              ref={containerRef}
              layoutId={layout ? `card-${card.title}` : undefined}
              className="relative z-[60] mx-auto my-10 h-fit max-w-3xl rounded-3xl bg-surface p-4 md:p-10"
            >
              <button
                type="button"
                aria-label="Close"
                className="sticky top-4 right-0 ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-ink"
                onClick={handleClose}
              >
                <IconX className="h-5 w-5 text-surface" />
              </button>
              <motion.p
                layoutId={layout ? `category-${card.title}` : undefined}
                className="text-base font-medium text-brand-dark"
              >
                {card.category}
              </motion.p>
              <motion.p
                layoutId={layout ? `title-${card.title}` : undefined}
                className="mt-2 text-2xl font-semibold text-ink md:text-4xl"
              >
                {card.title}
              </motion.p>
              <div className="py-6">{card.content}</div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <motion.button
        type="button"
        layoutId={layout ? `card-${card.title}` : undefined}
        onClick={() => setOpen(true)}
        className="relative z-10 flex h-80 w-60 flex-col items-start justify-start overflow-hidden rounded-3xl bg-canvas md:h-[26rem] md:w-[19.5rem]"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-full bg-gradient-to-b from-black/60 via-black/10 to-transparent" />
        <div className="relative z-40 p-5">
          <motion.p
            // Upstream keys this off card.category here but card.title in the
            // modal, so the two never match and the text jump-cuts instead of
            // morphing. Both use card.title now.
            layoutId={layout ? `category-${card.title}` : undefined}
            className="text-left font-sans text-sm font-medium text-white"
          >
            {card.category}
          </motion.p>
          <motion.p
            layoutId={layout ? `title-${card.title}` : undefined}
            className="mt-2 max-w-xs text-left font-sans text-lg font-semibold [text-wrap:balance] text-white md:text-2xl"
          >
            {card.title}
          </motion.p>
          {card.subtitle && (
            <p className="mt-2 max-w-xs text-left font-sans text-xs leading-relaxed text-white/85">
              {card.subtitle}
            </p>
          )}
        </div>
        <BlurImage
          src={card.src}
          alt={card.title}
          className="absolute inset-0 z-10 object-cover"
        />
      </motion.button>
    </>
  );
};

export const BlurImage = ({
  src,
  className,
  alt,
  ...rest
}: React.ImgHTMLAttributes<HTMLImageElement> & { src: string; alt: string }) => {
  const [isLoading, setLoading] = useState(true);
  const holderRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // A cached photo finishes loading before this render's onLoad handler is
    // attached, so the event never fires and the blur stays on forever. Caught
    // live: all three picks rendered at blur(8px) on a warm cache. Same failure
    // mode ProductImage already handles for onError.
    const img = holderRef.current?.querySelector("img");
    if (img?.complete && img.naturalWidth > 0) setLoading(false);
  }, [src]);

  return (
    // display:contents — the wrapper exists only to reach the <img>; it must not
    // introduce a box, since the image is absolutely positioned by its caller.
    <span ref={holderRef} className="contents">
      <ProductImage
        {...rest}
        src={src}
        alt={alt}
        className={cn(
          "h-full w-full transition duration-300",
          isLoading ? "blur-sm" : "blur-0",
          className,
        )}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoading(false)}
      />
    </span>
  );
};
