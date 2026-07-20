/**
 * Pre-generation window maths (04 §5).
 *
 * The cron runs every 15 minutes and enqueues users whose LOCAL arrival time
 * falls in `[now + 15m, now + 30m)` — so the moment is written and its audio
 * synthesized before she wakes to it, and `<300ms` playback is a cache read
 * rather than a generation (product 13 budget).
 *
 * DST is handled by construction rather than by arithmetic: everything is
 * compared as WALL-CLOCK time in her own timezone. "Seven in the morning" means
 * seven in the morning on the day the clocks go forward too — reasoning in UTC
 * offsets would silently deliver an hour early or late twice a year, on exactly
 * the mornings a habit is most fragile.
 *
 * Pure, so the whole matrix of timezones, midnight wraps and DST shifts can be
 * tested without a scheduler or a clock.
 */

/** The cron's cadence; also the width of the window it scans. */
export const WINDOW_WIDTH_MINUTES = 15;

/** Lead time: generation starts this long before arrival (04 §5, LIMITS.PREGEN_BUFFER_MINUTES). */
export const DEFAULT_LEAD_MINUTES = 30;

const MINUTES_PER_DAY = 24 * 60;

/**
 * Her wall-clock time right now, as minutes since local midnight.
 *
 * `Intl` does the timezone work, which means the IANA database decides what her
 * clock reads — including DST — rather than us storing an offset that goes stale.
 * An unknown timezone falls back to UTC instead of throwing: a bad string in one
 * profile must not take down the cron for everybody.
 */
export function localMinutesNow(timezone: string, now: Date): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);

    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');

    // Some locales render midnight as "24"; normalise it.
    return ((hour % 24) * 60 + minute) % MINUTES_PER_DAY;
  } catch {
    return localMinutesNow('UTC', now);
  }
}

/** Parses `HH:MM[:SS]` into minutes since midnight, or null if unusable. */
export function parseArrivalMinutes(arrivalTime: string | null | undefined): number | null {
  if (!arrivalTime) return null;

  const match = /^(\d{1,2}):(\d{2})/.exec(arrivalTime.trim());
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour > 23 || minute > 59) return null;

  return hour * 60 + minute;
}

/**
 * Minutes from now until her next arrival time, wrapping across midnight.
 *
 * The wrap is what makes a 00:15 arrival reachable from a 23:50 run — without
 * it, everyone who chose an early-morning time would simply never be generated.
 */
export function minutesUntilArrival(nowMinutes: number, arrivalMinutes: number): number {
  return (arrivalMinutes - nowMinutes + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

export interface PregenCandidate {
  timezone: string | null;
  arrivalTime: string | null;
}

/**
 * Is this user due for pre-generation on this run?
 *
 * The interval is half-open — `[lead - 15, lead)` — so consecutive cron runs
 * tile the day without overlap. A closed interval would put anyone sitting
 * exactly on a boundary into two consecutive runs, and "no double generation"
 * is a cost guarantee as much as a correctness one.
 */
export function isDueForPregeneration(
  candidate: PregenCandidate,
  now: Date,
  leadMinutes: number = DEFAULT_LEAD_MINUTES,
): boolean {
  const arrivalMinutes = parseArrivalMinutes(candidate.arrivalTime);
  if (arrivalMinutes === null) return false;

  const nowMinutes = localMinutesNow(candidate.timezone ?? 'UTC', now);
  const until = minutesUntilArrival(nowMinutes, arrivalMinutes);

  return until >= leadMinutes - WINDOW_WIDTH_MINUTES && until < leadMinutes;
}

/**
 * Cost guard (00 §D3): skip users who have not opened the app recently.
 *
 * Most of the LLM+TTS bill scales with ACTIVE users, and generating a daily
 * moment for someone who stopped opening the app two months ago is money spent
 * on nobody. A null `lastActiveAt` counts as active — a missing timestamp is
 * ambiguous, and the failure we prefer is one wasted generation over silently
 * dropping a real user out of her habit.
 */
export function isActiveEnough(
  lastActiveAt: string | null | undefined,
  now: Date,
  skipAfterDays: number,
): boolean {
  if (!lastActiveAt) return true;

  const last = new Date(lastActiveAt).getTime();
  if (Number.isNaN(last)) return true;

  return (now.getTime() - last) / 86_400_000 <= skipAfterDays;
}

/**
 * Her local calendar date as `YYYY-MM-DD`, for the "already has today's moment"
 * check. Must be computed in HER timezone: using the server's date would give
 * users west of it two moments on some days and none on others.
 */
export function localDateString(timezone: string, now: Date): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } catch {
    return localDateString('UTC', now);
  }
}
