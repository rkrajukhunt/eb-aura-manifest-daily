/**
 * Companion-voice copy for the memory surfaces (05 §8, product 10 §41–48, 14).
 *
 * Every user-facing string lives in `src/copy/` so the banned-phrase lint has one
 * audit surface (15 §5). Aura speaks as "I" — warm, plain, never clinical, never
 * salesy, never fake-positive.
 *
 * The tone here does real work. This screen is where a woman finds out how much
 * an app knows about her. Written coldly it reads as surveillance; written well
 * it reads as trust (product 10 §43: "the brand promise, not compliance theater").
 */
export const memoryCopy = {
  whatAuraKnows: {
    title: 'What I know about you',

    // The memory contract, stated plainly rather than buried in a policy.
    contract:
      'Everything here came from you. Remove anything you like — I’ll write differently from now on.',

    empty: 'We haven’t talked much yet. Whatever you tell me, I’ll keep here.',

    deleteAction: 'Forget this',
    // Confirmation is honest about scope: it takes effect going forward (09 §6).
    deleteConfirmTitle: 'Forget this?',
    deleteConfirmBody: 'I won’t use it again from now on.',
    deleteConfirmCancel: 'Keep it',
    deleteConfirmAccept: 'Forget it',
  },

  neverInclude: {
    title: 'Never mention',
    description:
      'Some things are better left unsaid. Anything here stays out of everything I write for you.',
    empty: 'Nothing yet.',
    addPlaceholder: 'A word, a name, a topic…',
    addAction: 'Add',
    removeAction: 'Remove',
  },
} as const;
