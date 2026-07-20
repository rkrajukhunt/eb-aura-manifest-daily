/**
 * Weekday and month names, shared because two surfaces must agree on what "the
 * date line" is (product 08):
 *
 *   - the backend QA gate enforces that a letter CLOSES with it (08 §5);
 *   - the mobile Letter fires its one soft haptic tick WHEN IT IS SPOKEN (08 §8).
 *
 * If those two lists ever drifted, the gate would pass a letter whose closing
 * line the player never ticks on — a silent loss of the letter's last beat. One
 * list, like `BANNED_PHRASES`, or the two surfaces disagree.
 */
export const WEEKDAYS: readonly string[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const MONTHS: readonly string[] = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Case-insensitive: does this text name a weekday? */
export function hasWeekday(text: string): boolean {
  const lowered = text.toLowerCase();
  return WEEKDAYS.some((day) => lowered.includes(day.toLowerCase()));
}

/** Case-insensitive: does this text name a month? */
export function hasMonth(text: string): boolean {
  const lowered = text.toLowerCase();
  return MONTHS.some((month) => lowered.includes(month.toLowerCase()));
}
