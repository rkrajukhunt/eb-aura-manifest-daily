import { charCountBucket, type AnalyticsClient } from './client';

describe('charCountBucket', () => {
  it('buckets a length into a safe coarse label', () => {
    expect(charCountBucket(0)).toBe('empty');
    expect(charCountBucket(1)).toBe('short');
    expect(charCountBucket(39)).toBe('short');
    expect(charCountBucket(40)).toBe('medium');
    expect(charCountBucket(159)).toBe('medium');
    expect(charCountBucket(160)).toBe('long');
  });

  it('treats a negative length as empty rather than throwing', () => {
    expect(charCountBucket(-1)).toBe('empty');
  });

  it('never returns anything but the four known buckets', () => {
    const buckets = new Set([0, 1, 50, 500, 10_000].map(charCountBucket));
    expect([...buckets].every((b) => ['empty', 'short', 'medium', 'long'].includes(b))).toBe(true);
  });
});

// Compile-time contract (13 §2): a payload on a no-payload event is a TYPE error,
// not a runtime concern. These lines must fail to compile — if tsc starts passing
// them, the catalog's "Record<string, never>" enforcement has silently loosened.
const capture = (() => {}) as unknown as AnalyticsClient['capture'];

// @ts-expect-error — app_first_open is a no-payload event; a payload must not type-check.
capture('app_first_open', { unexpected: 1 });
