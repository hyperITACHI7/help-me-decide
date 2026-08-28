import React, { useEffect, useRef } from "react";

/**
 * Adapted from Aceternity's use-outside-click. Upstream types the ref as
 * `RefObject<HTMLDivElement>` and the callback as `Function`, neither of which
 * compiles here: React 19's `useRef<T>(null)` returns `RefObject<T | null>`,
 * and `Function` is banned by the lint config (as is the `any` on the event).
 *
 * The callback is held in a ref so the listeners are attached once rather than
 * torn down and re-added on every render of the calling component.
 */
export const useOutsideClick = (
  ref: React.RefObject<HTMLElement | null>,
  callback: (event: MouseEvent | TouchEvent) => void,
) => {
  const callbackRef = useRef(callback);
  // In an effect rather than straight-line during render: writing a ref while
  // rendering trips react-hooks/refs. Listeners only fire from user events,
  // which are always after commit, so this is current by the time it matters.
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      // DO NOTHING if the element being clicked is the target element or their children
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      callbackRef.current(event);
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref]);
};
