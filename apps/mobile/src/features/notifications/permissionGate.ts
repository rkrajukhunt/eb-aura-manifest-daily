import { kv, STORAGE_KEYS } from '@/lib/storage';

/**
 * When the notification permission may be asked (11 §2).
 *
 * The OS dialog is deliberately deferred all the way to the first Home landing
 * AFTER the paywall. Product 08 forbids anything between the letter and the
 * paywall — no permission dialog, no rating prompt — and product 07 keeps it
 * out of onboarding so S11 can capture her arrival time without a system alert
 * interrupting the conversation. By the time it appears she has already told us
 * when she wants her moments, so the ask is a reminder rather than a pitch.
 */

interface PermissionGateState {
  /** True once the OS dialog has been shown, whatever she answered. */
  asked: boolean;
  /** When the denied-state hint was last shown — max once a week (11 §2). */
  lastHintAt: number | null;
}

const WEEK_MS = 7 * 86_400_000;

function read(): PermissionGateState {
  return (
    kv.get<PermissionGateState>(STORAGE_KEYS.notificationGate) ?? {
      asked: false,
      lastHintAt: null,
    }
  );
}

/** Records that the ask happened (or that it is now due). */
export function markPermissionAsked(asked: boolean): void {
  kv.set(STORAGE_KEYS.notificationGate, { ...read(), asked });
}

/** Is the ask due? Only once, and only after the paywall has been seen. */
export function shouldAskPermission(paywallSeen: boolean): boolean {
  return paywallSeen && !read().asked;
}

/**
 * Should the quiet denied-state hint appear?
 *
 * At most once a week (11 §2), and never as a modal. Denial is a legitimate
 * answer that the product works without — this is a reminder she can ignore
 * forever, not a re-ask.
 */
export function shouldShowDeniedHint(now: number = Date.now()): boolean {
  const { lastHintAt } = read();
  return lastHintAt === null || now - lastHintAt >= WEEK_MS;
}

export function markDeniedHintShown(now: number = Date.now()): void {
  kv.set(STORAGE_KEYS.notificationGate, { ...read(), lastHintAt: now });
}
