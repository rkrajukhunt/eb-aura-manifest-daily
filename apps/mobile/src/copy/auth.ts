/**
 * Signing in and signing out (03 §2.3, §5).
 *
 * Sign-in precedes the product (03 §2.1 reversal, 2026-07-24): the gate blocks
 * every route until an identity is attached, so "boots every user into an
 * anonymous account" no longer describes the primary path. The unclaimed edge
 * still exists — a phone that reaches the product without an identity — and
 * there `signOut.unclaimedBody` is the load-bearing honesty: signing out is
 * not the reversible housekeeping it is in other apps but the end of the
 * letters on that device, with no way back. Saying that plainly, at the moment
 * she taps, is the only defensible version of the button.
 *
 * `signIn.body` is the matching truth on the other side: signing in on a phone
 * that already has words on it replaces them, and she should know before, not
 * after.
 */
export const authCopy = {
  /**
   * The gate (founder decision, 2026-07-24). It is the first screen in the app,
   * so it carries the welcome as well as the ask — a bare form would make the
   * first thing she ever sees feel like a toll booth.
   */
  gate: {
    title: 'Welcome to Aura.',
    body: 'Sign in once, and your letters follow you to any phone.',
    google: 'Continue with Google',
    apple: 'Continue with Apple',
    email: 'Continue with email',
    or: 'or',
    emailPlaceholder: 'you@example.com',
    emailSend: 'Email me a link',
    emailSent: 'Check your email — the link brings you straight back.',
    /** Nothing worked, and she is stuck at the front door. Never a code. */
    failed: 'That didn’t go through. Try again in a moment.',
    back: 'Back',
    /** Shown when the whole device has no way to sign in configured. */
    unavailable: 'Sign-in isn’t set up on this build yet.',

    /**
     * Email + password (founder decision, 2026-07-25), which replaced the
     * link-only front door. The magic link survives underneath as the way back
     * in for anyone who forgets — hence `forgot` rather than a reset form.
     */
    password: {
      createTitle: 'Create your account.',
      createBody: 'One account, and your letters follow you to any phone.',
      signInTitle: 'Welcome back.',
      signInBody: 'Your letters, your memory and your subscription come with you.',

      emailLabel: 'you@example.com',
      passwordLabel: 'Password',
      /** Supabase's floor is 6; saying so up front beats a rejection after the fact. */
      passwordHint: 'At least 6 characters.',

      create: 'Create account',
      signIn: 'Sign in',
      /** The quiet swap between the two modes. */
      haveAccount: 'Already have an account? Sign in',
      needAccount: 'New here? Create an account',

      /** She is on the wrong tab, not in trouble. */
      emailTaken: 'That address already has an account. Sign in instead.',
      wrongCredentials: 'That email and password don’t match. Try again.',
      unconfirmed: 'Check your email to confirm the address, then sign in.',
      confirmEmail: 'Almost there — check your email to confirm the address.',

      /** No reset form: the link she already trusts does the job. */
      forgot: 'Forgot your password? Email me a link instead',
    },
  },

  signIn: {
    /** The quiet line under S1's button, and the Settings row title. */
    link: 'Already have an account?',
    action: 'Sign in',
    title: 'Welcome back.',
    body: 'Sign in and your letters, your memory and your subscription come with you.',
    /** Shown when this device already holds an unclaimed conversation. */
    replaceWarning:
      'This phone has words on it that aren’t saved anywhere else. Signing in puts them away for good.',
    apple: 'Continue with Apple',
    google: 'Continue with Google',
    email: 'Continue with email',
    emailPlaceholder: 'you@example.com',
    emailSent: 'Check your email — the link signs you straight in.',
    /** `shouldCreateUser: false` means an unknown address is a real answer. */
    emailUnknown: 'I don’t know that address. Try another, or start fresh.',
    later: 'Not now',
  },

  signOut: {
    /** Settings row. */
    title: 'Sign out',
    subtitleClaimed: 'You can sign back in any time',
    subtitleUnclaimed: 'Add a way back in first',

    /** The gate an unclaimed account meets instead of signing out. */
    unclaimedTitle: 'Add a way back in first.',
    unclaimedBody: 'Your letters live on this phone only. Sign out now and they’re gone for good.',
    /** She may still refuse. It is her account, and this is not a hostage. */
    anyway: 'Sign out anyway',

    confirmTitle: 'Sign out?',
    confirmBody: 'Your letters are safe. Sign back in whenever you like.',
    confirm: 'Sign out',
    cancel: 'Stay signed in',
  },
} as const;
