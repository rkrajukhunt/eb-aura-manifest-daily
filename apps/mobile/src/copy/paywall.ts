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

  /**
   * Onboarding v5 (design "Aura Ember Onboarding v5", 2026-09-01): the paywall
   * headline is keyed to her primary goal, three plans sit under it with the
   * trial plan as the hero, and the trial's exact dates are shown on their own
   * beat before anything is charged. Prices and trial lengths still come from
   * the store — `{price}`, `{days}` and `{date}` are filled at the call site.
   */
  v5: {
    headlines: {
      confidence: 'Confidence isn’t a mood. It’s a practice you can keep.',
      love: 'Written for the version of you that’s ready to be known.',
      money: 'A steadier relationship with money starts with what you tell yourself.',
      career: 'Words for the life you’re actually building.',
      calm: 'Three quiet minutes a day, written for the way you think.',
      habits: 'The small version, every day, is the whole thing.',
    },
    mostPopular: 'Most popular',
    yearlyTrial: 'Yearly · {days}-day trial',
    yearly: 'Yearly',
    monthly: 'Monthly',
    weekly: 'Weekly',
    perYear: '/yr',
    perWeek: '/wk',
    ctaTrial: 'Start my free trial',
    cta: 'Continue',
    freeTier: 'The free tier stays available. No card charged today.',
    close: 'Close',
    transparency: {
      title: 'Exactly what happens, and when.',
      day1Title: 'Today · Day 1',
      day1: 'Full access begins. Nothing charged.',
      remindTitle: 'Day {day} · {date}',
      remind: 'We remind you. Two days left.',
      endTitle: 'Day {day} · {date}',
      end: '{price} charged, unless you’ve cancelled.',
      cta: 'Start my {days} days',
      back: 'Back to plans',
    },
    handoff: {
      title: 'Your first two minutes{name}. Right now, while you’re here.',
      saved: 'Your gratitude entry is already saved',
      progress: '1 of 4',
      cta: 'Start day 1',
    },
    discount: {
      badge: 'ONCE ONLY, FIRST DISMISSAL',
      title: 'Take the first year at half.',
      discountPrice: '$24.99',
      originalPrice: '$49.99',
      subtext: 'First year only. Renews at $49.99/yr on {date}. Cancel any time.',
      gentleNote: 'Suppressed entirely when gentle_mode is true.',
      cta: 'Take the offer',
      decline: 'No thanks',
    },
  },

  /**
   * The trial-timeline presentation (2026-08-10). Honest by construction: it
   * names the day billing starts and promises a reminder first — the opposite of
   * a hidden charge. `{days}`, `{remind}` and `{price}` are filled from the
   * store's real intro offer, so the screen can never state a trial that the
   * store is not actually giving.
   */
  trial: {
    headline: 'We’ll remind you before your trial ends',
    subhead: 'Nothing will be charged today',
    badge: 'Free trial',
    todayTitle: 'Today',
    today: 'Full access to everything, completely free.',
    remindTitle: 'In {remind} days',
    remind: 'A gentle reminder lands before your trial ends.',
    billTitle: 'In {days} days',
    bill: 'Your subscription begins, unless you’ve cancelled by then.',
    cardTitle: 'Try it free',
    noCommitment: 'No commitment. Cancel anytime.',
    /** The auto-renew + price disclosure store review requires, said plainly. */
    renewal: 'Free for {days} days, then {price}. Renews automatically.',
  },

  /** The honest contrast block — what she has today vs what continues. */
  contrast: {
    todayLabel: 'Today',
    today: 'One letter. One morning.',
    everyDayLabel: 'Every day',
    everyDay: 'A new moment each morning. Your memory deepening. Letters on day 7, 30, 100.',
  },

  plans: {
    annualName: 'Annual',
    monthlyName: 'Monthly',
    weeklyName: 'Weekly',
    /** Price-row cadence suffixes; the price itself always comes from the store. */
    perYear: '/year',
    perMonth: '/month',
    perWeek: '/week',
    annualBadge: 'Best value',
    /**
     * The honest arithmetic PRINTED under each headline price (checklist #2).
     * `{monthly}` is the store-derived localized monthly equivalent.
     */
    annualEquivalent: 'about {monthly} a month, billed once',
    weeklyEquivalent: 'about {monthly} a month',
    /** Restated on the card as well as on Apple's sheet — checklist #3. */
    // `{days}` is filled from the store's real intro offer at the call site, so
    // this can never state a trial length the store did not actually configure.
    trialNote: 'Includes a {days}-day free trial.',
    renewalNote: 'Renews automatically. Cancel anytime in two taps.',
    cta: 'Continue',
    /** Trial-first CTA — shown when the selected plan carries a free trial. */
    ctaTrial: 'Start your free trial',
    restoring: 'Restoring…',
  },

  /**
   * The paywall's closing line, and what she reads if she declines — the free
   * tier is a first-class outcome.
   */
  dismissed: 'The letter is yours either way.',

  /** Defensive: Continue tapped on a plan with no store package behind it. */
  purchaseUnavailableNote: 'Purchases aren’t set up on this build yet.',

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
    /**
     * Shown when she asked to see plans and the store had none to give — no
     * offering configured, or the lookup failed. In voice, and never a code:
     * this is our problem to fix, not something she did (05 §8).
     */
    plansUnavailable: 'I can’t reach the plans right now. Try again in a moment?',
    back: 'Back',
  },
} as const;
