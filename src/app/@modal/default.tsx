// Renders nothing when no route is intercepted — i.e. on every normal page.
// A parallel slot without a default would 404 the whole route on a hard load.
export default function ModalDefault() {
  return null;
}
