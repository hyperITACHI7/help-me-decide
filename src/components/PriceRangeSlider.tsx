"use client";

const THUMB =
  "pointer-events-none absolute inset-x-0 top-1/2 h-0 w-full -translate-y-1/2 appearance-none bg-transparent " +
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 " +
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full " +
  "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand [&::-webkit-slider-thumb]:bg-surface " +
  "[&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:cursor-pointer " +
  "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 " +
  "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-brand " +
  "[&::-moz-range-thumb]:bg-surface [&::-moz-range-thumb]:cursor-pointer " +
  "focus-visible:outline-none";

function formatRupees(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

/**
 * Two overlaid range inputs — Myntra's price filter is a continuous range,
 * not a set of fixed bands, so a shopper can express "under ₹1,450" exactly.
 */
export function PriceRangeSlider({
  min,
  max,
  step = 100,
  value,
  onChange,
}: {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (next: [number, number]) => void;
}) {
  const [low, high] = value;
  const span = Math.max(1, max - min);
  const lowPct = ((low - min) / span) * 100;
  const highPct = ((high - min) / span) * 100;

  return (
    <div className="pt-1">
      <div className="relative h-4">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-border" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand"
          style={{ left: `${lowPct}%`, width: `${Math.max(0, highPct - lowPct)}%` }}
        />
        <input
          type="range"
          aria-label="Minimum price"
          min={min}
          max={max}
          step={step}
          value={low}
          onChange={(e) => onChange([Math.min(Number(e.target.value), high), high])}
          className={THUMB}
        />
        <input
          type="range"
          aria-label="Maximum price"
          min={min}
          max={max}
          step={step}
          value={high}
          onChange={(e) => onChange([low, Math.max(Number(e.target.value), low)])}
          className={THUMB}
        />
      </div>
      <p className="mt-2 text-xs text-ink">
        {formatRupees(low)} - {formatRupees(high)}
        {high >= max ? "+" : ""}
      </p>
    </div>
  );
}
