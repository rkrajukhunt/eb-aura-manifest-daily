import {
  DEFAULT_LEAD_MINUTES,
  isActiveEnough,
  isDueForPregeneration,
  localDateString,
  localMinutesNow,
  minutesUntilArrival,
  parseArrivalMinutes,
  WINDOW_WIDTH_MINUTES,
} from './pregen-window';

/**
 * Cron window maths (Phase 7 test list: tz, DST, inactive-skip, no double
 * generation).
 *
 * These decide whether someone wakes up to a moment. Getting the window wrong
 * is invisible in code review and shows up as a habit quietly not forming, so
 * the whole matrix is pinned here: every timezone shape, the midnight wrap, and
 * both DST transitions.
 */
describe('pregen window', () => {
  /** A UTC instant; each test reads it through a different timezone. */
  const at = (iso: string) => new Date(iso);

  describe('parseArrivalMinutes', () => {
    it('parses HH:MM', () => {
      expect(parseArrivalMinutes('07:00')).toBe(420);
      expect(parseArrivalMinutes('00:00')).toBe(0);
      expect(parseArrivalMinutes('23:59')).toBe(1439);
    });

    it('parses the HH:MM:SS Postgres time columns return', () => {
      expect(parseArrivalMinutes('07:00:00')).toBe(420);
    });

    it.each([null, undefined, '', 'nonsense', '25:00', '07:99'])(
      'refuses the unusable value %p',
      (value) => {
        expect(parseArrivalMinutes(value as string)).toBeNull();
      },
    );
  });

  describe('localMinutesNow', () => {
    it('reads UTC directly', () => {
      expect(localMinutesNow('UTC', at('2026-07-20T06:30:00Z'))).toBe(390);
    });

    it('shifts for a positive offset', () => {
      // Tokyo is UTC+9 year-round.
      expect(localMinutesNow('Asia/Tokyo', at('2026-07-20T06:30:00Z'))).toBe(15 * 60 + 30);
    });

    it('shifts for a negative offset', () => {
      // New York in July is UTC-4.
      expect(localMinutesNow('America/New_York', at('2026-07-20T06:30:00Z'))).toBe(2 * 60 + 30);
    });

    it('handles a half-hour offset', () => {
      // Kolkata is UTC+5:30.
      expect(localMinutesNow('Asia/Kolkata', at('2026-07-20T06:00:00Z'))).toBe(11 * 60 + 30);
    });

    it('reports local midnight as zero, not 1440', () => {
      expect(localMinutesNow('UTC', at('2026-07-20T00:00:00Z'))).toBe(0);
    });

    it('falls back to UTC for an unknown timezone rather than throwing', () => {
      // One bad profile string must not take the cron down for everyone.
      expect(localMinutesNow('Mars/Olympus_Mons', at('2026-07-20T06:30:00Z'))).toBe(390);
    });
  });

  describe('minutesUntilArrival', () => {
    it('measures forward within the same day', () => {
      expect(minutesUntilArrival(6 * 60, 7 * 60)).toBe(60);
    });

    it('wraps across midnight', () => {
      // 23:50 now, 00:15 arrival — 25 minutes away, not minus 1415.
      expect(minutesUntilArrival(23 * 60 + 50, 15)).toBe(25);
    });

    it('is zero at the arrival minute itself', () => {
      expect(minutesUntilArrival(7 * 60, 7 * 60)).toBe(0);
    });
  });

  describe('isDueForPregeneration', () => {
    const user = (arrivalTime: string | null, timezone = 'UTC') => ({ arrivalTime, timezone });

    it('fires on the run that lands inside the window', () => {
      // The window is half-open [15, 30) minutes before arrival, so the 06:45
      // run (15 out) owns a 07:00 arrival.
      expect(isDueForPregeneration(user('07:00'), at('2026-07-20T06:45:00Z'))).toBe(true);
    });

    it('fires at the far end of the window', () => {
      // 29 minutes out is still inside [15, 30).
      expect(isDueForPregeneration(user('07:00'), at('2026-07-20T06:31:00Z'))).toBe(true);
    });

    it('does NOT fire a full lead-time out — that is the boundary, and it is exclusive', () => {
      // Exactly 30 out belongs to no run; the next one, 15 out, takes it. An
      // inclusive bound here would put boundary users in two consecutive runs.
      expect(isDueForPregeneration(user('07:00'), at('2026-07-20T06:30:00Z'))).toBe(false);
    });

    it('does NOT fire a run too late', () => {
      // 14 minutes out: the window already passed on the previous run.
      expect(isDueForPregeneration(user('07:00'), at('2026-07-20T06:46:00Z'))).toBe(false);
    });

    it('never double-generates across consecutive runs', () => {
      // Every 15-minute run for a whole day; exactly one may fire.
      const fires = [];
      for (let minute = 0; minute < 24 * 60; minute += WINDOW_WIDTH_MINUTES) {
        const now = at(
          `2026-07-20T${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}:00Z`,
        );
        if (isDueForPregeneration(user('07:00'), now)) fires.push(minute);
      }

      expect(fires).toHaveLength(1);
    });

    it('fires exactly once a day for every arrival time on the clock', () => {
      for (let arrival = 0; arrival < 24 * 60; arrival += 30) {
        const label = `${String(Math.floor(arrival / 60)).padStart(2, '0')}:${String(arrival % 60).padStart(2, '0')}`;
        let fires = 0;

        for (let minute = 0; minute < 24 * 60; minute += WINDOW_WIDTH_MINUTES) {
          const now = at(
            `2026-07-20T${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}:00Z`,
          );
          if (isDueForPregeneration(user(label), now)) fires += 1;
        }

        expect({ label, fires }).toEqual({ label, fires: 1 });
      }
    });

    it('handles the midnight wrap — an early arrival is reached from the night before', () => {
      // 00:00 UTC, arrival 00:15 → 15 minutes out, across the date boundary.
      expect(isDueForPregeneration(user('00:15'), at('2026-07-20T00:00:00Z'))).toBe(true);
    });

    it('respects her timezone, not the server’s', () => {
      // 07:00 in Tokyo is 22:00 UTC the previous day; the firing run is 21:45Z.
      expect(isDueForPregeneration(user('07:00', 'Asia/Tokyo'), at('2026-07-19T21:45:00Z'))).toBe(
        true,
      );
      // The same instant is the middle of the night for a UTC user.
      expect(isDueForPregeneration(user('07:00', 'UTC'), at('2026-07-19T21:45:00Z'))).toBe(false);
    });

    it('works for a half-hour-offset timezone', () => {
      // 07:00 in Kolkata (UTC+5:30) = 01:30Z; the firing run is 01:15Z.
      expect(isDueForPregeneration(user('07:00', 'Asia/Kolkata'), at('2026-07-20T01:15:00Z'))).toBe(
        true,
      );
    });

    describe('DST — the two mornings a habit is most fragile', () => {
      it('still fires at 07:00 local on the spring-forward day', () => {
        // US clocks jump 02:00→03:00 on 2026-03-08. 07:00 EDT = 11:00Z, so the
        // firing run is 10:45Z.
        expect(
          isDueForPregeneration(user('07:00', 'America/New_York'), at('2026-03-08T10:45:00Z')),
        ).toBe(true);
      });

      it('does not fire an hour early on the spring-forward day', () => {
        // 11:30Z would be the pre-shift arithmetic answer; wall-clock says no.
        expect(
          isDueForPregeneration(user('07:00', 'America/New_York'), at('2026-03-08T11:30:00Z')),
        ).toBe(false);
      });

      it('still fires at 07:00 local on the fall-back day', () => {
        // Clocks go back 2026-11-01; 07:00 EST = 12:00Z, firing run 11:45Z.
        expect(
          isDueForPregeneration(user('07:00', 'America/New_York'), at('2026-11-01T11:45:00Z')),
        ).toBe(true);
      });

      it('fires exactly once across a whole spring-forward day', () => {
        let fires = 0;
        for (let minute = 0; minute < 24 * 60; minute += WINDOW_WIDTH_MINUTES) {
          const now = new Date(Date.UTC(2026, 2, 8, Math.floor(minute / 60), minute % 60));
          if (isDueForPregeneration(user('07:00', 'America/New_York'), now)) fires += 1;
        }

        expect(fires).toBe(1);
      });

      it('can fire twice inside the repeated fall-back hour — and that is the DB guard’s job', () => {
        // On 2026-11-01 the 01:00 hour happens twice in real time, so a 01:30
        // arrival genuinely has two "15 minutes before" instants. A pure
        // function has no memory and cannot dedupe that.
        //
        // The guard is the cron's own "does she already have a ready moment for
        // today" check, keyed on LOCAL DATE (`localDateString`) — and both
        // occurrences fall on the same local date, so the second enqueue is
        // dropped there. This test documents that layering rather than pretending
        // the window can solve it alone.
        let fires = 0;
        for (let minute = 0; minute < 24 * 60; minute += WINDOW_WIDTH_MINUTES) {
          const now = new Date(Date.UTC(2026, 10, 1, Math.floor(minute / 60), minute % 60));
          if (isDueForPregeneration(user('01:30', 'America/New_York'), now)) fires += 1;
        }

        expect(fires).toBeGreaterThanOrEqual(1);
        expect(fires).toBeLessThanOrEqual(2);

        // Both instants agree on whose "today" it is, which is what makes the
        // date-keyed dedupe sufficient.
        expect(localDateString('America/New_York', new Date(Date.UTC(2026, 10, 1, 5, 15)))).toBe(
          localDateString('America/New_York', new Date(Date.UTC(2026, 10, 1, 6, 15))),
        );
      });
    });

    it('skips a user who never chose a time', () => {
      expect(isDueForPregeneration(user(null), at('2026-07-20T06:45:00Z'))).toBe(false);
    });

    it('honours a custom lead time', () => {
      // Lead 45 → window [30, 45) minutes out.
      expect(isDueForPregeneration(user('07:00'), at('2026-07-20T06:30:00Z'), 45)).toBe(true);
      expect(isDueForPregeneration(user('07:00'), at('2026-07-20T06:15:00Z'), 45)).toBe(false);
    });

    it('uses the documented 30-minute lead by default (04 §5)', () => {
      expect(DEFAULT_LEAD_MINUTES).toBe(30);
    });
  });

  describe('isActiveEnough — the cost guard (00 §D3)', () => {
    const now = at('2026-07-20T12:00:00Z');

    it('includes someone who opened the app today', () => {
      expect(isActiveEnough('2026-07-20T09:00:00Z', now, 7)).toBe(true);
    });

    it('includes someone at exactly the boundary', () => {
      expect(isActiveEnough('2026-07-13T12:00:00Z', now, 7)).toBe(true);
    });

    it('skips someone who stopped opening the app', () => {
      expect(isActiveEnough('2026-06-01T12:00:00Z', now, 7)).toBe(false);
    });

    it('treats a missing timestamp as active — one wasted generation beats dropping a real user', () => {
      expect(isActiveEnough(null, now, 7)).toBe(true);
      expect(isActiveEnough('not a date', now, 7)).toBe(true);
    });
  });

  describe('localDateString — whose "today" it is', () => {
    it('gives her calendar date, not the server’s', () => {
      // 02:30 UTC on the 20th is still the 19th in New York.
      expect(localDateString('America/New_York', at('2026-07-20T02:30:00Z'))).toBe('2026-07-19');
      expect(localDateString('UTC', at('2026-07-20T02:30:00Z'))).toBe('2026-07-20');
    });

    it('is already tomorrow east of the line', () => {
      expect(localDateString('Asia/Tokyo', at('2026-07-19T16:00:00Z'))).toBe('2026-07-20');
    });

    it('falls back to UTC for an unknown timezone', () => {
      expect(localDateString('Mars/Olympus_Mons', at('2026-07-20T02:30:00Z'))).toBe('2026-07-20');
    });
  });
});
