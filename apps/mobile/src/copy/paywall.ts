/**
 * Paywall, locked features and claim (product 15, doc 12 §3).
 *
 * The whole surface is written against product 15's anti-resentment checklist,
 * and three lines here ARE checklist items rather than decoration:
 *
 *  - `dismissed` ("The letter is yours either way.") — the free tier is a real
 *    outcome, not a punishment. It is the last thing she reads if she declines.
 *  - `lapsedKeepsData` — checklist #6: a lapsed user keeps her Letter and her
 *    data. Win-back is warmth, never a hostage negotiation.
 *  - `claimNotRequired` — entitlement is never held back until she creates an
 *    account (03 §2.2). She paid; she gets it.
 *
 * What is deliberately ABSENT is as load-bearing as what is here: no countdown,
 * no "only today", no discounted second offer, no "X people joined this week".
 * Product 01 §10 and 15 ban all of it, and the copy lint cannot catch a dark
 * pattern that never gets written.
 */
export const paywallCopy = {
  /** Post-Letter cover (product 15 §spec). The headline mirrors the wow's close. */
  headline: 'Your future self has more to tell you.',

  /** The honest contrast block — what she has today vs what continues. */
  contrast: {
    todayLabel: 'Today',
    today: 'One letter. One morning.',
    everyDayLabel: 'Every day',
    everyDay: 'A new moment each morning. Your memory deepening. Letters on day 7, 30, 100.',
  },

  plans: {
    annualBadge: 'Best value',
    /** Restated on the card as well as on Apple's sheet — checklist #3. */
    trialNote: 'Includes a 7-day free trial.',
    renewalNote: 'Renews automatically. Cancel anytime in two taps.',
    cta: 'Continue',
    restoring: 'Restoring…',
  },

  /** Shown after dismissal — the free tier is a first-class outcome. */
  dismissed: 'The letter is yours either way.',

  footer: {
    restore: 'Restore purchase',
    terms: 'Terms',
    privacy: 'Privacy',
  },

  /** Locked-feature sheet (12 §3) — calm, never a full-screen interrupt. */
  locked: {
    title: 'This one is part of premium.',
    cta: 'See what’s included',
    dismiss: 'Not now',
    /** Per-feature line, in her language rather than the feature's name. */
    features: {
      manifest_anything: 'Ask for a moment about anything, any time.',
      refine: 'Reshape a moment until it sounds like you.',
      favorites: 'Keep every moment that lands, not only the letter.',
      collections: 'Gather your moments into collections.',
      share_export: 'Save a moment as an image to keep or share.',
    },
  },

  /** Claim-account sheet (03 §2.2). Offered, never demanded. */
  claim: {
    title: 'Keep this on any phone.',
    body: 'Your letters live on this device until you add a way back in.',
    apple: 'Continue with Apple',
    email: 'Use an email instead',
    emailPlaceholder: 'you@example.com',
    emailSent: 'Check your email — there’s a link waiting.',
    later: 'Later',
    /** Entitlement is never withheld pending a claim (03 §2.2). */
    claimNotRequired: 'Your subscription is already active.',
  },

  /** Settings → Subscription (12 §2). Manage is two taps, with no maze. */
  subscription: {
    title: 'Subscription',
    free: 'You’re on the free plan.',
    premium: 'You have premium.',
    trial: 'You’re in your free trial.',
    /** One quiet badge, no nagging (12 §3). */
    billingIssue: 'There’s a problem with your payment method.',
    renewsOn: 'Renews {date}',
    endsOn: 'Ends {date}',
    manage: 'Manage or cancel',
    restore: 'Restore purchase',
    /** Checklist #6, said plainly where a lapsing user will look. */
    lapsedKeepsData: 'If you stop, your letter and everything you’ve told me stay yours.',
  },
} as const;
