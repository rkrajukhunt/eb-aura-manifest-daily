/**
 * Notification and deep-link routing (06 §5, 11 §3).
 *
 * Pure, because the rule it encodes is easy to get wrong and impossible to
 * notice: **a link may never skip the wow funnel**. 06 §5 says cold-start deep
 * links resolve AFTER the boot gate, and that a notification cannot jump an
 * incomplete onboarding — it queues to Home instead. A tap that dropped a
 * half-onboarded user straight into a player would spend the letter before she
 * ever reached it.
 */

export type DeepLinkTarget =
  | { kind: 'moment'; momentId: string }
  | { kind: 'letter'; momentId: string }
  | { kind: 'affirmation' }
  | { kind: 'subscription' }
  | { kind: 'auth_callback' }
  | { kind: 'unknown' };

/** Parses an `aura://` URL into a target. Unrecognised links resolve to Home. */
export function parseDeepLink(url: string | null | undefined): DeepLinkTarget {
  if (!url) return { kind: 'unknown' };

  // Tolerate both `aura://moment/x` and an https universal link ending the same
  // way — the association domain lands on the same paths (06 §5).
  const path = url.replace(/^aura:\/\//, '').replace(/^https?:\/\/[^/]+\//, '');

  // Strip BOTH the query and the fragment. Supabase magic links carry their
  // token in the fragment (`aura://auth/callback#access_token=…`), so matching
  // on the raw tail would fail on the one link that matters most — the way she
  // gets back into her account.
  const [head, tail] = path.split(/[?#]/)[0]?.split('/') ?? [];

  switch (head) {
    case 'moment':
      return tail ? { kind: 'moment', momentId: tail } : { kind: 'unknown' };
    case 'letter':
      return tail ? { kind: 'letter', momentId: tail } : { kind: 'unknown' };
    case 'affirmation':
      return { kind: 'affirmation' };
    case 'settings':
      return tail === 'subscription' ? { kind: 'subscription' } : { kind: 'unknown' };
    case 'auth':
      return tail === 'callback' ? { kind: 'auth_callback' } : { kind: 'unknown' };
    default:
      return { kind: 'unknown' };
  }
}

export interface GateState {
  onboardingComplete: boolean;
  hasLetter: boolean;
  letterSeen: boolean;
}

/**
 * Where a tapped link should actually land, given where she is in the funnel.
 *
 * The ordering is the point (06 §5): auth callbacks always resolve (they are
 * how she gets INTO an account), but every content link waits behind an
 * incomplete onboarding and behind an unheard letter. A notification can never
 * skip the wow.
 */
export function resolveDeepLink(target: DeepLinkTarget, gate: GateState): string {
  // The magic-link callback is infrastructure, not content — it must work at
  // any point, including mid-onboarding on a second device.
  if (target.kind === 'auth_callback') return '/auth/callback';

  if (!gate.onboardingComplete) return '/(onboarding)';

  // A letter she has not heard outranks anything a notification points at.
  if (gate.hasLetter && !gate.letterSeen) return '/letter';

  switch (target.kind) {
    case 'moment':
      return `/player?momentId=${target.momentId}`;
    case 'letter':
      return `/letter?momentId=${target.momentId}`;
    case 'affirmation':
      return '/(tabs)/affirmations';
    case 'subscription':
      return '/settings/subscription';
    default:
      return '/(tabs)/home';
  }
}

/**
 * Whether this launch came from a notification, for open attribution (11 §5).
 *
 * The soften counter resets on an OPEN, and an open is only observable here —
 * which is why this is not merely analytics: without it the counter is a
 * one-way ratchet that can quiet her notifications permanently.
 */
export function isNotificationLaunch(data: Record<string, unknown> | null | undefined): boolean {
  return typeof data?.kind === 'string' && data.kind !== '';
}
