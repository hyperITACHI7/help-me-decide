"use client";

import React, { useState, useRef } from "react";
import {
  motion,
  useTransform,
  AnimatePresence,
  useMotionValue,
  useSpring,
} from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Adapted from Aceternity's animated-tooltip. Every motion value is unchanged
 * from upstream — the same spring config, the same cursor-tracked rotate and
 * translateX ranges, the same enter/exit spring on the tooltip.
 *
 * Two deliberate changes:
 *  - Items render an `icon` node rather than only an `<img>`, so this can be a
 *    category rail rather than a row of avatars.
 *  - The upstream `-mr-4` overlap is gone; spacing is the parent's job via
 *    `gap`, because these are separate targets rather than a stacked pile.
 */
export type AnimatedTooltipItem = {
  id: number;
  name: string;
  designation: string;
  image?: string;
  icon?: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
};

export const AnimatedTooltip = ({ items }: { items: AnimatedTooltipItem[] }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const springConfig = { stiffness: 100, damping: 15 };
  const x = useMotionValue(0);
  const animationFrameRef = useRef<number | null>(null);

  const rotate = useSpring(
    useTransform(x, [-100, 100], [-45, 45]),
    springConfig,
  );
  const translateX = useSpring(
    useTransform(x, [-100, 100], [-50, 50]),
    springConfig,
  );

  const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const halfWidth = event.currentTarget.offsetWidth / 2;
    const offsetX = event.nativeEvent.offsetX;

    animationFrameRef.current = requestAnimationFrame(() => {
      x.set(offsetX - halfWidth);
    });
  };

  return (
    <>
      {items.map((item) => (
        <div
          className="group relative"
          key={item.name}
          onMouseEnter={() => setHoveredIndex(item.id)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimatePresence>
            {hoveredIndex === item.id && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.6 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: {
                    type: "spring",
                    stiffness: 260,
                    damping: 10,
                  },
                }}
                exit={{ opacity: 0, y: 20, scale: 0.6 }}
                style={{
                  translateX: translateX,
                  rotate: rotate,
                  whiteSpace: "nowrap",
                }}
                className="absolute -top-16 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center justify-center rounded-md bg-black px-4 py-2 text-xs shadow-xl"
              >
                <div className="absolute inset-x-10 -bottom-px z-30 h-px w-[20%] bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
                <div className="absolute -bottom-px left-10 z-30 h-px w-[40%] bg-gradient-to-r from-transparent via-sky-500 to-transparent" />
                <div className="relative z-30 text-base font-bold text-white">
                  {item.name}
                </div>
                <div className="text-xs text-white">{item.designation}</div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="button"
            onMouseMove={handleMouseMove}
            onClick={item.onClick}
            aria-pressed={item.selected}
            aria-label={`${item.name}, ${item.designation}`}
            className={cn(
              "relative !m-0 flex h-14 w-14 items-center justify-center rounded-full border-2 !p-0 transition duration-500 group-hover:z-30 group-hover:scale-105",
              item.selected
                ? "border-brand bg-brand-soft text-brand-dark"
                : "border-border bg-surface text-ink",
            )}
          >
            {/* Children are pointer-events-none so offsetX stays measured
                against the circle itself, which is what drives the tilt. */}
            <span className="pointer-events-none flex items-center justify-center">
              {item.icon ?? null}
            </span>
          </button>
        </div>
      ))}
    </>
  );
};
