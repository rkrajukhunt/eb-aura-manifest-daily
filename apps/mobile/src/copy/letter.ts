/**
 * The Letter — ritual and playback copy (product 08, 07 S12).
 *
 * Verbatim from product 08 where it gives copy. Every line here is load-bearing
 * for the wow, and two of them are load-bearing for trust:
 *
 *   - `retry` never names an error. A failure at this exact moment — right after
 *     she told us the hardest thing — must read as care, not as a system fault
 *     (product 08 §2: "never an error code").
 *   - `kept` is a promise, not an upsell. The letter stays hers on the free tier
 *     (product 08 §when the audio ends: "a trust gift, not a hostage").
 *
 * The copy lint audits every string in this file.
 */
export const letterCopy = {
  /**
   * The generation ritual (product 07 S12, 08 §2). Shown in sequence, one at a
   * time — the wait IS the ritual, so there is no spinner and no percentage.
   * `{name}` is filled from her profile.
   */
  ritual: {
    lines: [
      'Thank you, {name}.',
      'I’m writing you something.',
      'It’s from someone who knows you very well.',
    ],
    /** Shown only if generation passes ~45s — honest, unhurried, still in voice. */
    patience: 'Almost. Some letters take a moment.',
    /** Any failure. Never a code, never an apology that sounds like a 500. */
    retry: 'Let me start again — this one matters.',
    /** Offline while generating (product 07 §global edge cases). */
    offline: 'I’ll have it ready the moment we’re back online.',
  },

  /**
   * Sound pre-check (product 08 §4). Only shown when we can actually tell her
   * volume is down — never a blind nag.
   */
  soundOff: 'Turn your sound on — this is meant to be heard.',

  /** The end state (product 08 §when the audio ends). */
  ending: {
    more: 'Your future self has more to tell you.',
    primary: 'Continue',
  },

  /**
   * The escape hatch behind the system back-swipe (product 08 §6). Never traps
   * her, never invites the exit: "continue" is the primary and is listed first.
   */
  pauseSheet: {
    title: 'Still here.',
    resume: 'Continue listening',
    later: 'Save for later',
  },

  /** Told on Home afterward, not during (product 08). Here so it lints with the rest. */
  kept: 'Your letter is kept. It’s yours forever.',

  /** VoiceOver label for the letter surface — the body text is read by the OS. */
  a11yLabel: 'A letter from your future self',
} as const;
