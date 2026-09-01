/**
 * Five stars filled to the exact rating, not to the nearest whole or half.
 *
 * A 4.2 drawn as four full stars and a 4.9 drawn as five are the same picture
 * as a flat 4 and a flat 5 — the number says one thing and the stars say
 * another, and the stars are what gets believed. One clipped overlay keeps
 * them honest: 4.9 renders as 98% of the row, visibly short of full.
 */
export function StarRating({
  rating,
  className,
}: {
  rating: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (rating / 5) * 100));

  return (
    <span
      className={className}
      // The row is decorative; the numeric rating is stated in text beside it.
      aria-hidden
    >
      <span className="relative inline-block align-middle leading-none">
        <span className="flex text-border">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} />
          ))}
        </span>
        <span
          className="absolute inset-y-0 left-0 flex overflow-hidden text-rating"
          style={{ width: `${pct}%` }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} />
          ))}
        </span>
      </span>
    </span>
  );
}

function Star() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0">
      <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" />
    </svg>
  );
}
