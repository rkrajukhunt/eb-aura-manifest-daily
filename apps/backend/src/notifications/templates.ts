/**
 * The notification catalog (11 §3).
 *
 * THE SAFETY BOUNDARY, and the reason this file takes no dependencies:
 *
 * Notification copy may be assembled ONLY from her `name`, a moment `title`
 * (which the QA gate guarantees is sensitive-free, 08 §5), and the fixed
 * templates below. It may never reach memory items, free text, her struggle, or
 * anything from the sensitive tier — a lock-screen preview is readable by anyone
 * holding the phone, which makes this the least private surface the product has
 * and the one place a leak is completely unrecoverable.
 *
 * That rule is enforced structurally rather than by care: this module imports
 * nothing from memory or generation, so there is no path by which the forbidden
 * data could arrive here even by mistake (09 §5's module boundary).
 *
 * The second rule is tone: ZERO guilt vocabulary, and absence is NEVER named.
 * Softening is silent (11 §5), win-back references her dream and not her
 * disappearance, and no notification exists purely to reopen the app — every
 * one below maps to real new content or a billing fact (product 09 hard rule).
 */

export type NotificationKind =
  'moment_arrival' | 'affirmation_nudge' | 'milestone' | 'trial_reminder' | 'winback';

export interface NotificationContent {
  title: string;
  body: string;
  /** Deep link the tap resolves to (11 §3, 06 §5). */
  url: string;
  data: Record<string, string>;
}

/** The only inputs a template may receive. Deliberately this small. */
export interface TemplateInput {
  name: string | null;
  /** A moment title — QA-guaranteed sensitive-free (08 §5). Never a body. */
  momentTitle?: string | null;
  momentId?: string;
  milestoneDay?: number;
}

/** Greeting that degrades gracefully when she never gave a name. */
function lead(name: string | null): string {
  return name && name.trim() !== '' ? `${name.trim()} — ` : '';
}

export function buildNotification(
  kind: NotificationKind,
  input: TemplateInput,
): NotificationContent | null {
  switch (kind) {
    case 'moment_arrival': {
      // No content, no notification (11 §7). Never notify about nothing.
      if (!input.momentId) return null;

      const theme = input.momentTitle?.trim();
      return {
        title: 'Aura',
        body: theme
          ? `${lead(input.name)}this morning's is about ${lowerFirst(theme)}.`
          : `${lead(input.name)}this morning's is ready.`,
        url: `aura://moment/${input.momentId}`,
        data: { kind, momentId: input.momentId },
      };
    }

    case 'affirmation_nudge':
      return {
        title: 'Aura',
        body: `${lead(input.name)}today's words are waiting.`,
        url: 'aura://affirmation/today',
        data: { kind },
      };

    case 'milestone': {
      if (!input.momentId) return null;
      return {
        title: 'Aura',
        body: `${lead(input.name)}I wrote you something. It's been a week.`,
        url: `aura://letter/${input.momentId}`,
        data: { kind, momentId: input.momentId },
      };
    }

    case 'trial_reminder':
      // Product 15 checklist #3, near-verbatim. "Both fine" is the whole point:
      // a trial reminder that pressures her is worse than none at all.
      return {
        title: 'Aura',
        body: 'Your trial converts in 2 days — keep or cancel, both fine.',
        url: 'aura://settings/subscription',
        data: { kind },
      };

    case 'winback': {
      if (!input.momentId) return null;
      // References the dream area only, never her absence (11 §3, product 16).
      return {
        title: 'Aura',
        body: `${lead(input.name)}I wrote one about the thing you told me.`,
        url: `aura://moment/${input.momentId}`,
        data: { kind, momentId: input.momentId },
      };
    }
  }
}

/** Titles are written as display case; mid-sentence they read better lowered. */
function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
