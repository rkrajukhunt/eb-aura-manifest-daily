/**
 * Onboarding v5 — the Aura Ember conversation (design "Aura Ember Onboarding
 * v5", 2026-09-01). Verbatim from the design's screen file; the copy lint
 * audits every string here.
 *
 * `{name}` / `{time}` / `{goal}` are interpolation slots filled by the flow.
 * Option KEYS are stable analytics/profile values; LABELS are what she reads.
 */

export type GoalKey = 'confidence' | 'love' | 'money' | 'career' | 'calm' | 'habits';
export type MoodKey = 'good' | 'okay' | 'updown' | 'low' | 'struggling';
export type ObstacleKey = 'forget' | 'motivation' | 'selfdoubt' | 'busy';
export type LexiconKey = 'universe' | 'neuro' | 'faith' | 'practical' | 'mix';
export type BeliefKey = 'identity' | 'process' | 'practical';
export type CalibrationKey = 'true' | 'want' | 'fake';
export type TimeKey = 'morning' | 'lunch' | 'evening' | 'before-bed';

export const onboardingCopy = {
  header: {
    back: 'Back',
    skip: 'Skip',
  },

  // 01 · Splash — the orb breathes once; auto-advances, or a faint Continue.
  a01Splash: {
    brand: 'Aura',
    tagline: 'Written for you, not at you',
    continue: 'Continue',
  },

  // 02 · What makes this different — the contract, before the first ask.
  a02Value: {
    title: 'Everyone else hands you the same affirmations.',
    body: 'Yours get written for you — in your words, at a level you can actually believe.',
    primary: 'Continue',
  },

  // Q1 · Goal — multi, max 3. The root node.
  a04Goals: {
    question: 'What do you most want to bring into your life?',
    helper: 'Pick up to three.',
    primary: 'Continue',
    choices: [
      { key: 'confidence', label: 'Confidence', phrase: 'confidence' },
      { key: 'love', label: 'Love & relationships', phrase: 'love' },
      { key: 'money', label: 'Money & abundance', phrase: 'abundance' },
      { key: 'career', label: 'Career & purpose', phrase: 'purpose' },
      { key: 'calm', label: 'Calm & less anxiety', phrase: 'calm' },
      { key: 'habits', label: 'Better habits', phrase: 'better habits' },
    ] as ReadonlyArray<{ key: GoalKey; label: string; phrase: string }>,
  },

  // Q2 · Priority — piped from Q1. Auto-skipped at one selection.
  qPriority: {
    question: 'Which one matters most right now, honestly?',
    helper: 'Piped from what you just picked.',
  },

  // Q3 · Context — branched on the primary goal. Habits has no variant.
  qContext: {
    eyebrow: 'Because you chose {goal}',
    variants: {
      career: {
        question: 'And the work you do now — how does it feel?',
        choices: [
          'Love it',
          'Fine for now',
          'Ready for something new',
          'Building something on the side',
        ],
      },
      money: {
        question: 'When money comes up, what’s the feeling?',
        choices: [
          'Tight and anxious',
          'Stuck at the same level',
          'Fine, I want more',
          'I avoid thinking about it',
        ],
      },
      love: {
        question: 'Where are you with this right now?',
        choices: [
          'Single, want to meet someone',
          'Building something new',
          'In it, want it stronger',
          'Healing from something',
        ],
      },
      confidence: {
        question: 'Where does it wobble most?',
        choices: ['Speaking up', 'How I look', 'My work', 'Around certain people'],
      },
      calm: {
        question: 'When is it loudest?',
        choices: ['First thing in the morning', 'At work', 'Late at night', 'It’s fairly constant'],
      },
    } as Readonly<
      Record<Exclude<GoalKey, 'habits'>, { question: string; choices: readonly string[] }>
    >,
  },

  // Q4 · Name and pronoun — both skippable. Never infer pronoun from the name.
  s03Name: {
    question: 'What should I call you?',
    placeholder: 'Your name',
    pronounHelper: 'And your pronoun, so the copy fits.',
    pronouns: ['she/her', 'he/him', 'they/them'] as readonly string[],
    pronounSkip: 'Skip',
    primary: 'Continue',
    // Gentle trim, never harsh validation.
    tooLong: 'That’s a lot of name — what do the people closest to you use?',
  },

  // VALUE · Your first one — a pre-written, process-framed line per goal.
  a11Affirmation: {
    eyebrow: 'Your first one',
    primary: 'This resonates',
    another: 'Show me another',
    bank: {
      career: [
        'I’m allowed to want a different life than the one I built.',
        'Today I can do the work without auditioning for it.',
        'I’m learning what I actually want from this.',
      ],
      money: [
        'I’m learning to look at my money without flinching.',
        'Today I can make one clear decision about this.',
        'I’m allowed to want more than I have.',
      ],
      love: [
        'I’m allowed to want to be known.',
        'I’m learning to stay open without bracing.',
        'Today I can let someone in a little.',
      ],
      confidence: [
        'I’m learning to trust my own voice in the room.',
        'Today I can take up the space I was given.',
        'I’m allowed to be a work in progress.',
      ],
      calm: [
        'Today I can let the morning start slowly.',
        'I’m learning that not every thought needs answering.',
        'I’m allowed to put something down.',
      ],
      habits: [
        'I take one clear step, most days.',
        'Today I can do the small version.',
        'I’m learning to keep my word to myself.',
      ],
    } as Readonly<Record<GoalKey, readonly string[]>>,
  },

  // Q5 · Mood — the safety router. low / struggling set gentle_mode.
  a05Feeling: {
    question: 'How’s the last week or two actually been?',
    helper: 'There’s no wrong answer here.',
    choices: [
      { key: 'good', label: 'Good' },
      { key: 'okay', label: 'Okay' },
      { key: 'updown', label: 'Up and down' },
      { key: 'low', label: 'Low' },
      { key: 'struggling', label: 'I’ve been really struggling' },
    ] as ReadonlyArray<{ key: MoodKey; label: string }>,
  },

  // VALUE · Insight (reciprocity on the very next screen) or Support.
  vInsight: {
    primary: 'Continue',
    byMood: {
      good: 'Good weeks are the best time to build something. Less to push against.',
      okay: '“Okay” is honest. We’ll aim at the part of the day that decides the rest.',
      updown:
        'That pattern usually tracks mornings more than anything else. Which is exactly where we’re going to aim.',
      low: 'Low weeks are the ones where the short version matters most. That’s the one I’ll build you.',
    } as Readonly<Record<Exclude<MoodKey, 'struggling'>, string>>,
    fallback: 'We’ll aim at the part of the day that decides the rest.',
    support: {
      title:
        'That’s a lot to be carrying. I’ll keep things short and gentle — no pressure, no scoreboard.',
      label: 'Support',
      body: 'Aura is a mindset practice. It isn’t therapy. If you need someone now, these are free and open around the clock.',
      link: 'See support options →',
      primary: 'Keep going',
    },
  },

  // Q6 · Obstacle — configures mechanics, not content. Stored as the label.
  a06Obstacle: {
    question: 'What usually gets in the way?',
    helper: 'Select all that apply',
    choices: [
      { key: 'forget', label: 'I forget', phrase: 'forgetting' },
      { key: 'motivation', label: 'I lose motivation', phrase: 'losing motivation' },
      { key: 'selfdoubt', label: 'Self-doubt', phrase: 'self-doubt' },
      { key: 'busy', label: 'I’m too busy', phrase: 'being too busy' },
    ] as ReadonlyArray<{ key: ObstacleKey; label: string; phrase: string }>,
    primary: 'Continue',
  },

  // Q7 · Belief language — the vocabulary fork.
  qLexicon: {
    question: 'What kind of language actually lands for you?',
    choices: [
      { key: 'universe', label: 'The universe & energy' },
      { key: 'neuro', label: 'Neuroscience & mindset' },
      { key: 'faith', label: 'Faith' },
      { key: 'practical', label: 'Just practical' },
      { key: 'mix', label: 'A mix' },
    ] as ReadonlyArray<{ key: LexiconKey; label: string }>,
  },

  // Q8 · Off limits — pre-filled from Q7. Continue works with zero picks.
  qOffLimits: {
    question: 'Anything you’d rather I stayed away from?',
    helper: 'You can change this any time.',
    wordsLabel: 'Words',
    topicsLabel: 'Topics',
    words: [
      'Manifest',
      'The universe',
      'God',
      'Vibration',
      'Energy',
      'Abundance',
    ] as readonly string[],
    topics: ['Money', 'Work', 'My body', 'Relationships', 'Family', 'Health'] as readonly string[],
    // Pre-selected when her language answer is neuroscience or practical.
    prefill: ['Manifest', 'The universe', 'Vibration', 'Energy'] as readonly string[],
    addYourOwn: '+ add your own',
    addPlaceholder: 'A word to leave out',
    primary: 'Continue',
  },

  // Q9 · Believability — one tap measures framing and tone.
  qBelief: {
    question: 'Which of these could you actually say out loud and mean it?',
    cards: [
      { key: 'identity', label: 'I am a magnet for everything I want.', tag: 'identity, bold' },
      { key: 'process', label: 'I’m learning to trust myself with this.', tag: 'process, gentle' },
      { key: 'practical', label: 'I take one clear step, most days.', tag: 'practical, grounded' },
    ] as ReadonlyArray<{ key: BeliefKey; label: string; tag: string }>,
    afterPick:
      'Good. Statements people don’t believe don’t work — there’s real research on that. Yours will be written at a level you can accept.',
  },

  // Q10 · Calibration — conditional. The contradiction resolver only.
  qCalibration: {
    eyebrow: 'One more, just to be sure',
    question: 'When you read “I am confident,” what happens?',
    choices: [
      { key: 'true', label: 'That’s true' },
      { key: 'want', label: 'I want it to be true' },
      { key: 'fake', label: 'It feels fake' },
    ] as ReadonlyArray<{ key: CalibrationKey; label: string }>,
  },

  // Reflect-back — the mirror. Her actual answers, never a template.
  vReflect: {
    eyebrow: 'Here’s what I heard{name}',
    line1:
      'You’re going after {goal}, it’s been {mood}, and the thing that usually derails you is {obstacle}.',
    line2: 'So we’re building you a short {dayPart} ritual, written {framing}{blocked}.',
    blockedClause: ', and we’ll leave {topic} out of it',
    moodSoft: {
      good: 'a good stretch',
      okay: 'okay',
      updown: 'up and down',
      low: 'a low stretch',
      struggling: 'genuinely hard',
    } as Readonly<Record<MoodKey, string>>,
    framingWord: { identity: 'boldly', process: 'gently', practical: 'plainly' } as Readonly<
      Record<BeliefKey, string>
    >,
    primary: 'That’s right',
    secondary: 'Not quite',
  },

  // Q11 · Time and commitment — the implementation intention is the button.
  a08RitualTime: {
    question: 'When will you take your three minutes?',
    fineTune: 'Fine-tune',
    primary: 'I’ll do this at {time}',
    // Keys map to `arrival_time` via ARRIVAL_PRESETS (commit.ts); `time` is the
    // preset the reminder will actually use, so the button never over-promises.
    choices: [
      { key: 'morning', label: 'Morning, 7–9am', time: '8:00am', dayPart: 'morning' },
      { key: 'lunch', label: 'Midday, 12–2pm', time: '12:30pm', dayPart: 'midday' },
      { key: 'evening', label: 'Evening, 6–8pm', time: '8:00pm', dayPart: 'evening' },
      { key: 'before-bed', label: 'Before bed, 9–11pm', time: '10:00pm', dayPart: 'evening' },
    ] as ReadonlyArray<{ key: TimeKey; label: string; time: string; dayPart: string }>,
  },

  // VALUE · First gratitude entry — seeds the journal before the money ask.
  vGratitude: {
    question: 'Name one thing you’re grateful for.',
    helper: 'Small counts. Small is usually better.',
    placeholder: 'Today, I’m grateful for…',
    examplesLabel: 'Examples',
    examples: [
      'Morning coffee & quiet time',
      'My health and family',
      'A supportive friend',
      'Good sleep & fresh start',
      'Sunny weather today',
    ] as readonly string[],
    primary: 'Save it',
    skip: 'Skip',
  },

  // AI consent — explicit, unbundled, before anything is generated.
  vConsent: {
    question: 'How Aura writes your personal practice',
    helper:
      'Your data stays private. We craft your weekly affirmations using secure, privacy-focused AI.',
    points: [
      'Your goals and choices guide our model to draft your daily moments.',
      'Your name, email, and journal entries are never transmitted or shared.',
      'Toggle AI personalization off anytime in Settings.',
    ] as readonly string[],
    primary: 'Yes, write my custom week',
    secondary: 'No — use pre-written library',
  },

  // Notification pre-prompt — the preview, then the three promises.
  s12Notifications: {
    previewApp: 'Aura',
    question: 'Want this to reach you at {time}?',
    promises: [
      { title: 'At your time', body: 'Your moment arrives at the hour you chose — not whenever.' },
      { title: 'Once a day', body: 'One gentle arrival. Never a stream, never a scorecard.' },
      { title: 'Always yours', body: 'Turn it off in a single tap, anytime.' },
    ] as ReadonlyArray<{ title: string; body: string }>,
    primary: 'Yes, remind me',
    skip: 'Not now',
  },

  // Notifications · second chance — only after “Not now”. Shown once.
  s12NotificationsMore: {
    eyebrow: 'Before we go on',
    question: 'Your moment can’t reach you on its own.',
    helper:
      'Without a reminder, the words written for you sit quietly in the app — and most mornings the day gets loud before you remember to open it. One gentle arrival at the time you chose is all it takes.',
    previewLabel: 'Tomorrow, {time}',
    previewApp: 'Aura',
    previewWhen: 'now',
    note: 'Still just one arrival a day. No nudges, no scorecards — off anytime.',
    primary: 'Turn on notifications',
    // If the OS won't prompt again (already declined), we send her to Settings.
    openSettings: 'Open Settings',
    skip: 'Continue without them',
  },

  /**
   * The bold (identity) and grounded (practical) banks — the framed set the
   * reminder preview quotes from. Process-framed lines live in a11Affirmation.
   */
  framedBank: {
    identity: {
      career: [
        'I am building the life I actually want.',
        'I am the person my work is becoming.',
        'I am worth the room I’m in.',
      ],
      money: [
        'I am a magnet for abundance.',
        'I am safe with money.',
        'I am building real wealth.',
      ],
      love: ['I am easy to love.', 'I am worth being chosen.', 'I am open to what’s coming.'],
      confidence: ['I am someone who speaks up.', 'I am enough in any room.', 'I am my own proof.'],
      calm: ['I am steady in my own body.', 'I am safe right now.', 'I am allowed to rest.'],
      habits: [
        'I am someone who keeps their word.',
        'I am consistent.',
        'I am the sum of my small days.',
      ],
    },
    practical: {
      career: [
        'I send one thing today, done not perfect.',
        'I spend thirty minutes on the side project.',
        'I ask the question I’ve been avoiding.',
      ],
      money: [
        'I look at one number today.',
        'I move ten dollars I won’t miss.',
        'I name the thing I’m saving for.',
      ],
      love: [
        'I send the message I’ve been drafting.',
        'I say the true thing, plainly.',
        'I make the plan instead of waiting.',
      ],
      confidence: [
        'I say one sentence in the meeting.',
        'I don’t apologise before I speak.',
        'I finish the thought.',
      ],
      calm: [
        'I take three slow breaths before the first email.',
        'I put the phone down for ten minutes.',
        'I write the worry down and close the book.',
      ],
      habits: [
        'I do the two-minute version.',
        'I set it out the night before.',
        'I show up, badly if needed.',
      ],
    },
  } as Readonly<Record<'identity' | 'practical', Readonly<Record<GoalKey, readonly string[]>>>>,

  editGuard: {
    entry: 'Fix an earlier answer',
    /** Spoken label before anything is answered — plain back, nothing to fix. */
    back: 'Back',
    title: 'Which one?',
    // Edits revise, never restart (product 07 rules).
    note: 'Your other answers stay exactly as they are.',
    cancel: 'Never mind',
  },
} as const;
