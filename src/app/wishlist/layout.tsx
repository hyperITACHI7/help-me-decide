/**
 * Exists only to host the @modal parallel slot, so "View reactions" can open
 * the showcase results over the wishlist instead of navigating away from it.
 */
export default function WishlistLayout({
  children,
  modal,
}: LayoutProps<"/wishlist">) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
