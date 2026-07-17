/**
 * Profile tab copy (product 11: "trust center + memory front door").
 */
export const profileCopy = {
  tagline: 'The more I know, the realer it feels.',

  sections: {
    basics: 'BASICS',
    dream: 'YOUR DREAM',
    people: 'YOUR PEOPLE',
    note: 'ANYTHING I SHOULD KNOW',
  },

  fields: {
    name: 'Your name',
    selfDescription: 'How you describe yourself',
    dreamCity: 'Your dream city',
    dreamHome: 'Your dream home',
    note: 'A note for me',
  },

  edit: {
    save: 'Save',
    cancel: 'Never mind',
    // The memory contract on every save (09 §6, product 10 §44): edits take
    // effect on the next generation, and the app says so.
    savedNote: 'I’ll write differently from now on.',
    empty: 'Nothing yet — tap to tell me.',
  },

  people: {
    remove: 'Remove',
    // Deactivation copy — the row survives for history; generation stops using
    // it (02 §1). No guilt, no confirmation drama.
    removed: 'Okay. I won’t bring them up.',
    empty: 'Just you for now — and that’s plenty.',
  },

  links: {
    whatAuraKnows: 'What I know about you',
    neverInclude: 'Never mention',
  },
} as const;
