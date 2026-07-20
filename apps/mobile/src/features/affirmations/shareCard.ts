import { captureRef } from 'react-native-view-shot';

/** Story-format export (product 09 §9.3 share-as-image). */
export const SHARE_WIDTH = 1080;
export const SHARE_HEIGHT = 1920;

export type ShareTemplate = 'light' | 'dusk' | 'plain';
export const SHARE_TEMPLATES: readonly ShareTemplate[] = ['light', 'dusk', 'plain'];

/**
 * What may appear on a shared card (product 18 privacy rule).
 *
 * The affirmation text and a subtle brand mark. That is the entire list. Her
 * name, her city, her people, her struggle and any memory-derived detail are
 * all excluded — a share leaves the device and stops being ours to protect, so
 * the rule is enforced here rather than trusted to whoever builds the next
 * template.
 */
export interface ShareCardContent {
  affirmation: string;
  template: ShareTemplate;
}

/**
 * Strips anything that is not the affirmation itself.
 *
 * Pure and exported so the privacy rule is testable without rendering: the
 * why-line, the technique label and every profile field are dropped, whatever
 * a caller passes in.
 */
export function toShareContent(input: {
  affirmation: string;
  template?: ShareTemplate;
}): ShareCardContent {
  return {
    affirmation: input.affirmation.trim(),
    template: input.template ?? 'light',
  };
}

/**
 * Captures a rendered card as a PNG at story dimensions.
 *
 * Captures the SAME view she is looking at rather than a second offscreen
 * layout, so what she shares is what she saw — a parallel export layout would
 * drift from the card within a release or two.
 */
export async function captureShareCard(viewRef: Parameters<typeof captureRef>[0]): Promise<string> {
  return captureRef(viewRef, {
    format: 'png',
    quality: 1,
    width: SHARE_WIDTH,
    height: SHARE_HEIGHT,
  });
}
