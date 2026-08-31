/**
 * Shared by the wishlist UI and the server actions it posts to, so the button
 * that enables and the action that validates can't drift apart. Kept out of
 * the "use server" modules because those may only export async functions.
 */

/** A showcase of one item isn't a comparison worth swiping. */
export const MIN_SHOWCASE_ITEMS = 2;
