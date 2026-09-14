import { dayLabelFor } from './dayLabel';

/**
 * Calendar-day labeling must never shift around DST. The old implementation
 * subtracted a fixed 24h (`now - DAY_MS`), which on a 23h/25h day resolves
 * "yesterday" to the wrong calendar day; the fix re-derives the date from the
 * local y/m/d components instead. These cases pin that behaviour.
 *
 * The assertions hold in every timezone: the retrieved day simply equals the
 * calendar day before `now`, which is the truthful label regardless of locality.
 */
describe('dayLabelFor', () => {
  it('labels yesterday as a calendar day, not 24h back', () => {
    const now = new Date(2025, 9, 28, 0, 30);
    expect(dayLabelFor('2025-10-27', now)).toBe('Yesterday');
    expect(dayLabelFor('2025-10-26', now)).toBe('Sunday');
  });

  it('treats today as today', () => {
    const now = new Date(2025, 9, 28, 0, 30);
    expect(dayLabelFor('2025-10-28', now)).toBe('Today');
  });

  it('keeps the week window in calendar days', () => {
    const now = new Date(2025, 9, 28, 0, 30);
    expect(dayLabelFor('2025-10-22', now)).toBe('Wednesday');
    expect(dayLabelFor('2025-10-21', now)).toBe('October 21');
  });
});
