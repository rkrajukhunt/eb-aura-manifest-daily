import { gratitudeCopy } from '@/copy/gratitude';

/**
 * Same local `YYYY-MM-DD` shape as `useGratitude`'s `localDate`, duplicated
 * here so this label helper stays pure — importing the hook module would drag
 * supabase and storage into every screen that only wants a day name.
 */
function localDate(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * `YYYY-MM-DD` `daysBack` calendar days before `now`, DST-safe.
 *
 * A fixed `-DAY_MS` shift is wrong around the clocks changing: a 23-hour or
 * 25-hour day lands the offset clock at 11pm or 1am local, so "yesterday" can
 * resolve two calendar days back. Date-constructor arithmetic on the y/m/d
 * components wraps months and years and keeps the local calendar day honest —
 * the same trick the streak code uses by keying at UTC noon.
 */
function localDateForOffset(now: Date, daysBack: number): string {
  return localDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBack));
}

/**
 * The small day line above a history entry (v4 §gratitude): "Yesterday", then
 * the weekday name while the entry is under a week old, then the plain date —
 * seven "Sunday"s in one list would say nothing.
 *
 * `entryDate` is her local `YYYY-MM-DD` (see `localDate`), so parsing it at
 * local midnight keeps the label in the same "today" the entry was written in.
 */
export function dayLabelFor(entryDate: string, now: Date = new Date()): string {
  if (entryDate === localDate(now)) return gratitudeCopy.dayToday;
  if (entryDate === localDateForOffset(now, 1)) return gratitudeCopy.dayYesterday;

  const date = new Date(`${entryDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return entryDate;

  const withinWeek = entryDate >= localDateForOffset(now, 6);
  return withinWeek
    ? new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date)
    : new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(date);
}
