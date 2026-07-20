import type { ApiErrorKey } from '@aura/shared';

import { ApiRequestError } from './api';

/**
 * `ApiErrorKey` → in-voice copy (07 §5, product 14 §errors).
 *
 * The contract's whole point is that the server sends a stable KEY and mobile
 * owns the words: "message is developer-facing only and is never shown to a
 * user". Before this existed the mobile mutations had no `.catch()` at all, so
 * every documented failure — a spent credit, a crisis-flagged desire, a refine
 * she had already used — silently did nothing and left the sheet open.
 *
 * No error code and no vendor string appears in any of these lines (05 §8).
 */
const ERROR_COPY: Record<ApiErrorKey, string> = {
  entitlement_required: 'That one is part of premium.',
  credits_exhausted: 'You’ve used this week’s. They come back Monday.',
  refine_limit_reached: 'I’ve already rewritten this one. The next one will know.',
  already_ready: 'That one’s already here.',
  // The crisis path (14 §5). Deliberately warm and non-clinical: she wrote
  // something that needs care, and a validation-style message would be cold at
  // the exact moment coldness costs the most.
  crisis_support: 'Let’s sit with that one rather than turn it into a moment.',
  unauthorized: 'Let me get you signed back in.',
  validation_failed: 'That didn’t quite come through — try again?',
  rate_limited: 'One moment — let me catch up.',
  generation_failed: 'That one didn’t come through. Let me try again.',
  internal: 'Something went wrong on my side. Try again in a moment?',
};

/** The line to show for any thrown error. Never leaks a code or a raw message. */
export function errorCopyFor(error: unknown): string {
  if (error instanceof ApiRequestError) return ERROR_COPY[error.key];
  return ERROR_COPY.internal;
}

/** The key, when a caller needs to branch (e.g. offering the paywall on 402). */
export function errorKeyOf(error: unknown): ApiErrorKey | null {
  return error instanceof ApiRequestError ? error.key : null;
}
