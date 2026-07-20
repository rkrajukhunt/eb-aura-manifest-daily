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
    comingLabel: 'Coming for you',
    recentLabel: 'Recently played',
    manifest: 'Ask for a moment',
  },

  states: {
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

  player: {
    play: 'Play',
    pause: 'Pause',
    back15: 'Back 15 seconds',
    forward15: 'Forward 15 seconds',
    speed: 'Speed',
    favorite: 'Keep this',
    unfavorite: 'Kept',
    readMode: 'Read',
    listenMode: 'Listen',
    refine: 'Not quite right?',
    minimize: 'Minimize',
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
    title: 'What do you want a moment about?',
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
