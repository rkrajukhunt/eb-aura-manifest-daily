/**
 * Notification permission and preferences (doc 11 §2, §4).
 *
 * The permission ask is BANKED-CONTEXT (11 §2): she chose an arrival time at
 * S11 and never saw an OS dialog then, so by the time this appears she has
 * already told us when she wants her moments. The sheet reminds her of her own
 * decision rather than making a case.
 *
 * `returned` is the missed-day state, and it is the sharpest expression of the
 * absence rule in the whole product: she has been gone, we know it, and we say
 * nothing about it. "There you are" is warmth, not accounting.
 */
export const notificationsCopy = {
  permission: {
    /** `{time}` is her own arrival time from S11. */
    title: 'So your moments can find you at {time}.',
    body: 'One note a morning, when yours is ready. Nothing else.',
    allow: 'Turn them on',
    later: 'Not now',
  },

  /** Denied → one quiet hint a week, max (11 §2). Never a nag. */
  deniedHint: 'Your moments arrive at {time} — I can tell you when they’re ready.',
  openSettings: 'Open settings',

  prefs: {
    title: 'Notifications',
    arrival: 'Morning moment',
    arrivalDetail: 'A note when today’s is ready.',
    nudge: 'Affirmation nudge',
    nudgeOptions: {
      quiet: 'Quiet',
      once_daily: 'Once a day',
      custom_hours: 'Choose hours',
    },
    from: 'From',
    to: 'To',
  },

  /**
   * The missed-day return state (Phase 9 mobile tasks).
   * No absence is named — not "welcome back", not "we missed you".
   */
  returned: 'There you are. Today’s moment kept.',
} as const;
