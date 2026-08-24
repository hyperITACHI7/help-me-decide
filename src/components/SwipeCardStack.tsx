"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Shared swipe-to-decide mechanics for both step 3 (keep/discard triage,
 * TriageDeck) and step 5 (like/pass voting, VotePanel) — the two places in
 * this app that are actually a "swipe to like/dislike system."
 *
 * Interaction model adapted from ThreeUI's KoiStudies reference
 * (threeui.com/synthralos-halftone.html): a CSS 3D card stack with a
 * pointer-tilt idle state, a drag layer separated from the stack's resting
 * transform, a horizontal-intent-aware commit threshold, and arrow-key
 * navigation. The reference's own signature effect — the animated
 * per-tile pixel-mask "halftone" reveal driven by a precomputed video-frame
 * bitmask — is deliberately NOT reproduced: it exists to reveal photographic
 * koi art, and this app's cards are flat placeholder art, so copying that
 * machinery would be effort spent on a effect with nothing here to reveal.
 * What's adapted is the tactile stack + gesture system, not the art engine.
 */

export type SwipeDirection = "left" | "right";

const EXIT_MS = 240;
const IDLE_TILT_MAX = 5;
const DRAG_TILT_MAX = 7;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function SwipeCardStack<T extends { id: string }>({
  queue,
  disabled = false,
  leftLabel,
  rightLabel,
  onSwipeLeft,
  onSwipeRight,
  renderCard,
  describeItem,
}: {
  queue: T[];
  disabled?: boolean;
  leftLabel: string;
  rightLabel: string;
  onSwipeLeft: (item: T) => void;
  onSwipeRight: (item: T) => void;
  renderCard: (item: T) => React.ReactNode;
  describeItem: (item: T) => string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [turn, setTurn] = useState(0);
  const [tiltX, setTiltX] = useState(0);
  const [tiltY, setTiltY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exitDir, setExitDir] = useState<SwipeDirection | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [finePointer, setFinePointer] = useState(false);

  const startRef = useRef({ x: 0, y: 0 });
  const pointerIdRef = useRef<number | null>(null);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    // Reading a client-only media query can't be a lazy useState initializer
    // (no `window` during SSR), same reasoning as VotePanel's fingerprint read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(motionQuery.matches);
    setFinePointer(pointerQuery.matches);
    const onMotionChange = () => setReducedMotion(motionQuery.matches);
    const onPointerChange = () => setFinePointer(pointerQuery.matches);
    motionQuery.addEventListener?.("change", onMotionChange);
    pointerQuery.addEventListener?.("change", onPointerChange);
    return () => {
      motionQuery.removeEventListener?.("change", onMotionChange);
      pointerQuery.removeEventListener?.("change", onPointerChange);
    };
  }, []);

  const current = queue[0];
  const behind = queue.slice(1, 3);

  // The parent consumed the current item (queue advanced) — clear all local
  // gesture state so the new top card starts centered, not mid-flight. This
  // IS the "reset local state when a derived value changes" case React's own
  // docs carve out; there's no key to remount by since the stack persists.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setExitDir(null);
    setDragX(0);
    setDragY(0);
    setTurn(0);
    setTiltX(0);
    setTiltY(0);
    setDragging(false);
  }, [current?.id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function resetTransform() {
    setDragX(0);
    setDragY(0);
    setTurn(0);
    setTiltX(0);
    setTiltY(0);
  }

  function commitThreshold(): number {
    const width = containerRef.current?.getBoundingClientRect().width ?? 300;
    return clamp(width * 0.18, 56, 96);
  }

  function committedDirection(x: number, y: number, threshold: number): SwipeDirection | null {
    const horizontalIntent = Math.abs(x) >= Math.abs(y) * 0.75;
    if (Math.abs(x) < threshold || !horizontalIntent) return null;
    return x > 0 ? "right" : "left";
  }

  function fire(direction: SwipeDirection) {
    if (!current || disabled || exitDir) return;
    setExitDir(direction);
    const sign = direction === "right" ? 1 : -1;
    const width = containerRef.current?.getBoundingClientRect().width ?? 300;
    setDragX(sign * Math.max(220, width * 0.85));
    setTurn(sign * 10);
    const finish = () => {
      if (direction === "right") onSwipeRight(current);
      else onSwipeLeft(current);
    };
    if (reducedMotion) finish();
    else window.setTimeout(finish, EXIT_MS);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (disabled || exitDir) return;
    pointerIdRef.current = e.pointerId;
    startRef.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (!dragging) {
      // Idle pointer tilt — a resting card leans toward the cursor, matching
      // KoiStudies's hover response. Fine pointers only, so it never fights
      // touch scrolling.
      if (disabled || exitDir || !finePointer) return;
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setTiltX(clamp((0.5 - y) * 2 * IDLE_TILT_MAX, -IDLE_TILT_MAX, IDLE_TILT_MAX));
      setTiltY(clamp((x - 0.5) * 2 * IDLE_TILT_MAX, -IDLE_TILT_MAX, IDLE_TILT_MAX));
      return;
    }

    if (pointerIdRef.current !== e.pointerId) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    setDragX(dx);
    setDragY(dy);
    setTurn(clamp((dx / rect.width) * 14, -16, 16));
    setTiltX(clamp((-dy / rect.width) * DRAG_TILT_MAX, -DRAG_TILT_MAX, DRAG_TILT_MAX));
    setTiltY(clamp((dx / rect.width) * DRAG_TILT_MAX, -DRAG_TILT_MAX, DRAG_TILT_MAX));
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!dragging || pointerIdRef.current !== e.pointerId) return;
    setDragging(false);
    pointerIdRef.current = null;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    const direction = committedDirection(dx, dy, commitThreshold());
    if (direction) fire(direction);
    else resetTransform();
  }

  function onPointerLeave() {
    if (!dragging) {
      setTiltX(0);
      setTiltY(0);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled || exitDir) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      fire("left");
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      fire("right");
    }
  }

  if (!current) return null;

  const instant = dragging || reducedMotion;
  const dragTransform = `translate3d(${dragX}px, ${dragY}px, 0) rotateX(${tiltX}deg) rotateY(${tiltY}deg) rotateZ(${turn}deg)`;

  return (
    <div style={{ perspective: "900px" }}>
      {/* Announces the active card to screen readers without a second,
          visible status line (KoiStudies's aria-live .stack-status pattern). */}
      <p aria-live="polite" className="sr-only">
        {describeItem(current)}
      </p>

      <div className="relative" style={{ transformStyle: "preserve-3d" }}>
        {behind
          .slice()
          .reverse()
          .map((item, i) => {
            const depth = behind.length - i; // 2 = furthest back, 1 = just behind
            const x = depth === 2 ? 5 : -3.5;
            const y = depth === 2 ? 6.5 : 4;
            const rot = depth === 2 ? 3 : -2.2;
            const scale = 1 - depth * 0.035;
            return (
              <div
                key={item.id}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  transform: `translate3d(${x}%, ${y}%, ${-depth * 14}px) rotateZ(${rot}deg) scale(${scale})`,
                }}
              >
                {renderCard(item)}
              </div>
            );
          })}

        <div
          ref={containerRef}
          role="group"
          tabIndex={0}
          aria-label={`${describeItem(current)}. Swipe, or press Left for ${leftLabel}, Right for ${rightLabel}.`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerLeave}
          onPointerCancel={onPointerLeave}
          onKeyDown={onKeyDown}
          className="relative cursor-grab touch-pan-y select-none outline-none active:cursor-grabbing"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div
            className="relative"
            style={{
              transform: dragTransform,
              transition: instant ? "none" : "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)",
              transformStyle: "preserve-3d",
            }}
          >
            {renderCard(current)}
            {dragX > 40 && (
              <span className="pointer-events-none absolute right-3 top-3 rounded border-2 border-discount px-2 py-1 text-sm font-extrabold text-discount">
                {rightLabel}
              </span>
            )}
            {dragX < -40 && (
              <span className="pointer-events-none absolute left-3 top-3 rounded border-2 border-brand px-2 py-1 text-sm font-extrabold text-brand">
                {leftLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
