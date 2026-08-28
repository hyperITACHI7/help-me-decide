"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Aceternity's Lens. The zoom mechanic is upstream's: a duplicate of the
 * children scaled about the cursor, revealed through a radial mask so only a
 * circular window shows the magnified copy.
 *
 * Two changes:
 *  - `className` on the root, so the lens can be stretched to fill an
 *    absolutely-positioned card rather than sizing itself to its children.
 *  - The unused `containerRef` and the commented-out state upstream leaves
 *    behind are gone.
 */
interface LensProps {
  children: React.ReactNode;
  zoomFactor?: number;
  lensSize?: number;
  position?: { x: number; y: number };
  isStatic?: boolean;
  hovering?: boolean;
  setHovering?: (hovering: boolean) => void;
  className?: string;
}

export const Lens: React.FC<LensProps> = ({
  children,
  zoomFactor = 1.5,
  lensSize = 170,
  isStatic = false,
  position = { x: 200, y: 150 },
  hovering,
  setHovering,
  className,
}) => {
  const [localIsHovering, setLocalIsHovering] = useState(false);

  const isHovering = hovering !== undefined ? hovering : localIsHovering;
  const setIsHovering = setHovering || setLocalIsHovering;

  const [mousePosition, setMousePosition] = useState({ x: 100, y: 100 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const focus = isStatic ? position : mousePosition;

  const magnifier = (
    <motion.div
      initial={{ opacity: 0, scale: 0.58 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="absolute inset-0 overflow-hidden"
      style={{
        maskImage: `radial-gradient(circle ${lensSize / 2}px at ${focus.x}px ${focus.y}px, black 100%, transparent 100%)`,
        WebkitMaskImage: `radial-gradient(circle ${lensSize / 2}px at ${focus.x}px ${focus.y}px, black 100%, transparent 100%)`,
        transformOrigin: `${focus.x}px ${focus.y}px`,
        zIndex: 50,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: `scale(${zoomFactor})`,
          transformOrigin: `${focus.x}px ${focus.y}px`,
        }}
      >
        {children}
      </div>
    </motion.div>
  );

  return (
    <div
      className={cn("relative z-20 overflow-hidden rounded-lg", className)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={handleMouseMove}
    >
      {children}
      {isStatic ? (
        magnifier
      ) : (
        <AnimatePresence>{isHovering && magnifier}</AnimatePresence>
      )}
    </div>
  );
};
