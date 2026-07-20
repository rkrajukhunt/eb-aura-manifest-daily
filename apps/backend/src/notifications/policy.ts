/**
 * Notification policy (11 §5–§6, product 16).
 *
 * Pure, because every rule here is a promise about restraint and none of them
 * is observable by looking at a screen: how many ignored notes before we back
 * off, when a milestone is genuinely due, and whether a send has already gone
 * out for this morning.
 */

/** Ignored arrivals before the arrival note softens (11 §5). */
export const SOFTEN_THRESHOLD = 3;

/** The softened cadence: Mon / Wed / Sat (11 §5). 0 = Sunday. */
export const SOFTENED_WEEKDAYS = [1, 3, 6];

export interface SoftenState {
  ignoredArrivalCount: number;
  softened: boolean;
}

/**
 * A send went out and was not opened.
 *
 * Softening is SILENT and gradual — product 16 puts respect above
 * re-engagement, so ignoring us costs her nothing and is never mentioned.
 */
export function recordIgnored(state: SoftenState): SoftenState {
  const ignoredArrivalCount = state.ignoredArrivalCount + 1;
  return { ignoredArrivalCount, softened: ignoredArrivalCount >= SOFTEN_THRESHOLD };
}

/**
 * She opened one.
 *
 * Any open unsoftens AND resets the counter (11 §5). Not a decrement: coming
 * back should restore the normal rhythm immediately rather than making her earn
 * it back one morning at a time.
 */
export function recordOpened(): SoftenState {
  return { ignoredArrivalCount: 0, softened: false };
}

/** May an arrival note be sent today, given her state and the local weekday? */
export function maySendArrival(
  state: SoftenState,
  prefs: { arrivalEnabled: boolean },
  localWeekday: number,
): boolean {
  if (!prefs.arrivalEnabled) return false;
  if (!state.softened) return true;

  return SOFTENED_WEEKDAYS.includes(localWeekday);
}

/**
 * Day N of her account, counted in whole local days since she started.
 *
 * The day she signs up is day 0, so "day 7" is a week later — the milestone
 * copy says "it's been a week" and it has to be true.
 */
export function accountDay(createdAt: string | Date, now: Date): number {
  const start = new Date(createdAt).getTime();
  if (Number.isNaN(start)) return -1;
  return Math.floor((now.getTime() - start) / 86_400_000);
}

/** V1 ships D7 only; D30/D100 are V1.1 (04 §5). */
export const MILESTONE_DAYS = [7];

/**
 * Is she due a milestone letter today?
 *
 * Exact-match on the day rather than "at least 7", so a user whose cron run was
 * missed does not receive a week-one letter on day 20 — by then the copy would
 * be a small lie, and the letter's whole value is that it is timely.
 */
export function isMilestoneDue(
  createdAt: string | Date,
  now: Date,
  alreadySentDays: number[] = [],
): number | null {
  const day = accountDay(createdAt, now);
  if (!MILESTONE_DAYS.includes(day)) return null;
  if (alreadySentDays.includes(day)) return null;
  return day;
}

/**
 * The dedupe key for one arrival send (11 §6).
 *
 * Keyed on her LOCAL date so travelling across timezones — which can put her in
 * two scan windows on the same local day — still produces one morning's note.
 */
export function arrivalDedupeKey(localDate: string): string {
  return localDate;
}

/** Win-back fires once, three days after a lapse, and never repeats (11 §3). */
export const WINBACK_DELAY_DAYS = 3;

export function isWinbackDue(lapsedAt: string | null, now: Date, alreadySent: boolean): boolean {
  if (!lapsedAt || alreadySent) return false;

  const days = accountDay(lapsedAt, now);
  // Exactly the third day: a warm note a week late reads as an afterthought,
  // and repeating it would be the nagging product 16 forbids.
  return days === WINBACK_DELAY_DAYS;
}
