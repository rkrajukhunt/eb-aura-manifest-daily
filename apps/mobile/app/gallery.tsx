import { Redirect } from 'expo-router';

import { GalleryScreen } from '@/features/gallery/GalleryScreen';

/**
 * Dev-only route: open with `aura://gallery` or type /gallery in the dev menu.
 * The Phase 1 DoD check lives here — nothing links to it from the product.
 * Guarded out of release builds: the dev path never ships.
 */
export default function GalleryRoute() {
  if (!__DEV__) return <Redirect href="/(tabs)/home" />;
  return <GalleryScreen />;
}
