/**
 * The Conversation, S1–S11 (product 07). Verbatim where the doc gives copy;
 * in-voice where it gives intent. The copy lint audits every string here.
 *
 * {name} and {city} are interpolation slots filled by the flow — her name is
 * used within 10 seconds of learning it (product 07 S3).
 */
export const onboardingCopy = {
  s01Welcome: {
    title: 'Create the life you desire.',
    // Price honesty before effort (product 01 §radical pricing honesty). The
    // amount itself comes from config at Phase 10 — this line must not hardcode
    // a number that RevenueCat later contradicts.
    priceHonesty: 'Free to begin. You’ll see pricing clearly before anything starts.',
    primary: 'Begin',
    secondary: 'Restore purchase',
  },

  s02MeetAura: {
    lines: [
      'Hi. I’m Aura.',
      'To write your future, I need to know a little about your present.',
      'Everything you share stays between us — and you can see and edit everything I remember, anytime.',
    ],
    primary: 'I’m ready',
  },

  s03Name: {
    question: 'What should I call you?',
    primary: 'Continue',
    // Gentle trim, never harsh validation (product 07 S3 edge).
    tooLong: 'That’s a lot of name — what do the people closest to you use?',
  },

  s04SelfDescription: {
    question:
      'Since we’ve just met, {name} — how would you describe yourself? Whatever comes to mind.',
    primary: 'Continue',
    skip: 'Skip for now',
    // Reflection when she skipped (product 07 S4 edge).
    skippedReflection: 'We’ll fill this in together as we go.',
    emptyNudge: 'even one word helps me',
  },

  s05WorkFeeling: {
    question: 'And the work you do now — how does it feel?',
    choices: {
      love_it: 'Love it',
      fine_for_now: 'It’s fine for now',
      ready_for_new: 'Ready for something new',
      building_side: 'Building something on the side',
    },
    primary: 'Continue',
  },

  s06Values: {
    question: 'What matters most to you right now? Pick up to two.',
    choices: [
      'Feeling truly fulfilled',
      'Financial freedom',
      'Being recognized',
      'Living with purpose',
      'Being free',
      'Family & love',
    ],
    primary: 'Continue',
  },

  s07DreamHome: {
    question: 'Close your eyes for a second. Where do you live, in the life you want?',
    cards: {
      penthouse: 'Penthouse',
      'beach-house': 'Beach house',
      loft: 'Loft',
      'cozy-cottage': 'Cozy cottage',
      'country-house': 'Country house',
      'mountain-retreat': 'Mountain retreat',
      'minimalist-studio': 'Minimalist studio',
      'anywhere-view': 'Anywhere with a view',
    },
    primary: 'Continue',
  },

  s08DreamCity: {
    question: 'And where is it? A real place, or just a feeling of one.',
    primary: 'Continue',
    skip: 'Not sure yet',
    // Reflection template; {city} is her verbatim answer (product 07 S8).
    reflection: '{city}. I can already hear the mornings there.',
  },

  s09People: {
    question: 'Who’s in this life with you? A name and one word for each.',
    namePlaceholder: 'Name',
    descriptorPlaceholder: 'One word — “safe”, “fun”…',
    addAnother: 'Add another',
    justMe: 'Just me for now',
    // Reflection proves listening (product 07 S9); {name} is the last person added.
    reflection: '{name}’s in. Your circle is forming.',
    primary: 'Continue',
  },

  s10Struggle: {
    question: 'Last one, and it matters most. What’s the thing that feels heaviest right now?',
    primary: 'Continue',
    skip: 'Not today',
    // Gentle, non-clinical; NEVER followed by a sales beat (product 07 S10).
    reflection: 'Thank you for trusting me with that. I’ll hold it carefully.',
  },

  s11ArrivalTime: {
    question: 'Your moments will be written for you daily. When should they arrive?',
    morning: 'Morning',
    evening: 'Evening',
    pickTime: 'Pick a time',
    primary: 'Continue',
  },

  editGuard: {
    entry: 'Fix an earlier answer',
    title: 'Which one?',
    // Edits revise, never restart (product 07 rules).
    note: 'Your other answers stay exactly as they are.',
    cancel: 'Never mind',
  },

  reflectionTypingPause: {
    // 600ms typing dots before a reflection lands (product 13 §catalog:
    // "proves someone is listening before replying"). Duration lives with the
    // motion catalog; this key exists so screens don't invent their own copy.
  },
} as const;
