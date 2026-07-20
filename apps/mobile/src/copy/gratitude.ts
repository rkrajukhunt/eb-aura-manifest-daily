/**
 * Gratitude (product 09 §9.4).
 *
 * The line that matters most here is `memoryContract`. Product 09 requires it
 * be shown ONCE: "What you write here may return in your moments. That's the
 * point." Saying it plainly, early, and only once is what makes the feature
 * feel like a promise rather than a surprise when a line comes back weeks later.
 *
 * Note what is absent: no streak language, no "you missed", no "don't break the
 * chain". Product 16 is shame-free by design and product 14 bans that vocabulary
 * — the copy lint would fail this file if any of it appeared.
 */
export const gratitudeCopy = {
  title: 'One thing from today.',

  /** Default prompt when we have nothing personal to draw on. */
  prompt: 'What’s one thing you’re glad about today?',
  /** Personalized variant; `{person}` comes from her own people (product 09 §9.4). */
  personalizedPrompt: 'You mentioned {person} yesterday — anything from them today?',

  placeholder: 'Even a small thing.',
  /** Offered after the field sits empty for a few seconds. */
  starter: 'Even “my coffee this morning” counts.',

  save: 'Keep it',
  saved: 'Kept.',

  /** Shown once, ever (product 09 §9.4). */
  memoryContract: 'What you write here may return in your moments. That’s the point.',

  historyTitle: 'Your record',
  /** History empty state — an invitation, never a scold. */
  historyEmpty: 'Your first line starts the record.',

  /** Per-entry delete is promised in product 09 §9.4. */
  delete: 'Delete this line',
} as const;
