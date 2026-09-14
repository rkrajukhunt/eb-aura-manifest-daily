/**
 * Home, the player, Refine and Manifest (product 09 §9.1–9.2, 11).
 *
 * The states carry most of the weight here. Product 09 is explicit that the
 * daily moment has NO empty state — generation is scheduled ahead, and if it
 * fails she gets yesterday's back plus an honest line, never a blank screen and
 * never an error code. `stillForming` and `didNotArrive` are those two lines.
 */
export const momentsCopy = {
  home: {
    /** Time-of-day greetings; `{name}` is filled from her profile. */
    morning: 'Good morning, {name}.',
    afternoon: 'Hello, {name}.',
    evening: 'Evening, {name}.',
    /** Before she has told us a name — should be vanishingly rare after S3. */
    anonymousGreeting: 'Hello.',

    todayLabel: 'Today’s moment',
    /** One quiet line under the moment title (v4 §home). */
    todaySecondary: 'From the life you described.',
    /**
     * The legible-personalization line (2026-08-10) — names WHY today's moment
     * fits her, from a value she chose in onboarding. `{value}` is one of her
     * s06 values, lowercased. Falls back to `todaySecondary` when she has none.
     */
    personalization: 'Shaped around {value}.',
    /**
     * The first-Home welcome card (2026-08-10) — a one-time orientation to the
     * daily ritual, shown once and dismissed. `{name}` is her profile name.
     */
    firstRun: {
      title: 'Welcome home, {name}.',
      /** When we somehow have no name (vanishingly rare after S3). */
      welcomeNoName: 'Welcome home.',
      body: 'Each morning, a new moment is written just for you — it’s right below. There’s a line to carry with you, and space for what you’re grateful for. That’s the whole ritual.',
      dismiss: 'Begin',
    },
    /** Action row when the duration is unknown. */
    listen: 'Listen',
    /** `{n}` is whole minutes, rounded up. */
    listenDuration: 'Listen · {n} min',
    comingLabel: 'Coming for you',
    collectionsLabel: 'Collections',
    recentLabel: 'Recently played',
    manifest: 'Ask for a moment',
    /** A moment whose title never arrived — rare, but never blank. */
    untitled: 'A moment',
  },

  /** The Home collections grid and `collection/[id]` (v4 §home). */
  collections: {
    favorites: 'Favorites',
    ondemand: 'On demand',
    /** `{n}` moments on a collection card. */
    momentCount: '{n} moments',
    momentCountOne: '1 moment',
  },

  states: {
    /**
     * First run: she has no moment yet and the on-open fallback is writing her
     * first one. A filled, in-voice card (orb + these two lines) rather than a
     * bare screen — product 09's "no empty state" made literal.
     */
    firstRunTitle: 'Your first moment is on its way.',
    firstRunBody: 'I’m writing it now, from everything you told me. It’ll be here in a moment.',
    /** Cron missed it and the fallback is generating. Honest, unhurried. */
    stillForming: 'Today’s is still forming.',
    /** Shown alongside yesterday's moment while today's is written. */
    replayOffer: 'Here’s yesterday’s while you wait.',
    /** Generation failed outright (product 09 §9.1 — never a code). */
    didNotArrive: 'This one didn’t come through. Let me rewrite it.',
    retry: 'Try again',
    /** Previews of what is being written next (product 11). */
    formingPreview: 'Being written',
  },

  refine: {
    title: 'How should it change?',
    more_realistic: 'More realistic',
    softer: 'Softer',
    more_ambitious: 'More ambitious',
    note: 'Tell me in your words',
    notePlaceholder: 'What would make it yours?',
    submit: 'Rewrite it',
    /** Product 09 §9.1: one refine per moment, framed as care rather than a cap. */
    alreadyRefined: 'I’ve already rewritten this one. The next one will know.',
    working: 'Rewriting…',
  },

  manifest: {
    title: 'Manifest anything.',
    /** One secondary line under the sheet title (v4 §sheets). */
    description: 'A moment from your future life, for any situation. Ready in about a minute.',
    placeholder: 'The day I…',
    submit: 'Make it',
    /** `{n}` remaining this week — specialness, not scarcity (product 09 §9.2). */
    remaining: '{n} left this week — I make them count',
    lastOne: 'One left this week — I make it count',
    none: 'You’ve used this week’s. They come back Monday.',
    working: 'Writing it…',
    /** Inspiration placeholders, drawn from her own goal area where possible. */
    examples: [
      'The day I sign my first client',
      'The morning I wake up in the new place',
      'The first evening it feels easy',
    ],
  },
} as const;
