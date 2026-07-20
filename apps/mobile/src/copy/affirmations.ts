/**
 * Affirmations (product 09 §9.3 — the founder's key focus).
 *
 * The `why` lines are the product's actual differentiator: no competitor
 * explains WHY an affirmation is phrased the way it is. They are written to be
 * grounded rather than mystical — "your mind rehearses it as already true",
 * never "the universe responds to your vibration". Product 14 bans the latter
 * outright, and the education layer is the wedge.
 */
export const affirmationsCopy = {
  todayTitle: 'Today’s affirmation',
  reveal: 'Reveal',
  /** After viewing — "one a day, that's enough" (product 09 §9.3). */
  enough: 'One a day. That’s enough.',
  nextIn: 'Next one {time}',

  create: 'Create with Aura',
  collectionTitle: 'Kept words',
  collectionEmpty: 'Your kept words will live here.',

  share: 'Share',
  keep: 'Keep this one',
  kept: 'Kept',

  guided: {
    goalTitle: 'What’s this for?',
    goalPlaceholder: 'Or tell me in your words',
    feelingTitle: 'How do you want to feel?',
    toneTitle: 'How should it sound?',
    candidatesTitle: 'Three ways to say it',
    generating: 'Writing them…',
    back: 'Back',
    next: 'Next',

    goalAreas: ['Work', 'Money', 'Health', 'Love', 'Home', 'Confidence'],
    feelings: ['Calm', 'Certain', 'Held', 'Awake', 'Enough', 'Ready'],
    tones: {
      gentle: 'Gentle',
      bold: 'Bold',
      grounded: 'Grounded',
    },
  },

  /**
   * The technique layer (product 09 §9.3c). Each `why` is one line, grounded in
   * a real mechanism — this is the education wedge, and hand-waving here would
   * cost the credibility the whole feature trades on.
   */
  techniques: {
    identity: {
      label: 'Identity',
      why: 'Present tense, stated as who you are — your mind rehearses it as already true rather than as something to chase.',
    },
    present_tense: {
      label: 'Present tense',
      why: 'Said as now, not as someday. A future-tense wish keeps the thing permanently ahead of you.',
    },
    three_six_nine: {
      label: '369',
      why: 'Write it three times this morning, six times today, nine times tonight. The repetition is the practice; the number just gives it a shape.',
      morning: 'Morning · 3',
      afternoon: 'Today · 6',
      night: 'Tonight · 9',
      done: 'Done for today.',
    },
    scripting: {
      label: 'Scripting',
      why: 'Write a short paragraph as though the day already happened. Specifics do the work — the ordinary details are what make it land.',
      prompt: 'Write one paragraph about the day, as if it has already happened.',
    },
  },

  /** Post-moment ritual (product 09 §9.1 "gentle flow to affirmation"). */
  ritual: {
    toAffirmation: 'One more thing.',
    toGratitude: 'One thing from today?',
    done: 'That’s enough for today.',
  },
} as const;
