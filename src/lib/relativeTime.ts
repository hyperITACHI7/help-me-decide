/**
 * Coarse relative time ("12 min ago").
 *
 * `now` is passed in rather than read from Date.now() inside: the server
 * renders this once and the client renders it again on hydration, and if the
 * two read the clock independently they disagree by however long hydration
 * took — which React reports as a hydration mismatch the moment that gap
 * crosses a bucket boundary. Handing both the same instant makes the first
 * client render byte-identical to the server's; a timer can move it forward
 * afterwards, when React is no longer comparing.
 */
/**
 * The instant the current request is being served at.
 *
 * Exists as a named function because react-hooks/purity flags a bare
 * `Date.now()` in a component body — correctly, for a client render, where
 * re-reading the clock on every re-render is exactly the instability it
 * warns about. In an async Server Component the body runs once per request
 * and this is request-scoped data, fetched alongside the database read
 * rather than computed during render. Naming it that way says so.
 */
export function requestNow(): number {
  return Date.now();
}

export function relativeTime(iso: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return "just now";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;

  const months = Math.round(days / 30);
  return `${months} ${months === 1 ? "month" : "months"} ago`;
}
