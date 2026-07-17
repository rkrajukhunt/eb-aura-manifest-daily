import { GalleryScreen } from '@/features/gallery/GalleryScreen';

/**
 * Dev-only route: open with `aura://gallery` or type /gallery in the dev menu.
 * The Phase 1 DoD check lives here — nothing links to it from the product.
 */
export default function GalleryRoute() {
  return <GalleryScreen />;
}
