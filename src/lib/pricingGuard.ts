// N1/N5 enforcement on model output (edge_case.md EC16/EC17): the schema has
// no discount/price-drop field to leak (phased_architecture.md §6.3), but a
// generated question or tier reason could still smuggle in a price frame the
// model wasn't explicitly told to avoid. Scan every piece of AI-generated
// text a user will see before it's ever rendered or persisted.
const BANNED_PATTERNS: RegExp[] = [
  /discount/i,
  /\bsale\b/i,
  /coupon/i,
  /cashback/i,
  /price[\s-]?drop/i,
  /wait for .*(price|deal|sale|offer)/i,
  /\d+%\s*off/i,
  /cheaper (later|soon|elsewhere)/i,
  /\bbudget\b/i,
  /afford(able)?/i,
  /willing to pay/i,
  /how much .*(spend|pay)/i,
  /free shipping/i,
];

export function violatesPricingPolicy(text: string): boolean {
  return BANNED_PATTERNS.some((re) => re.test(text));
}

export function anyViolatesPricingPolicy(texts: string[]): boolean {
  return texts.some(violatesPricingPolicy);
}
