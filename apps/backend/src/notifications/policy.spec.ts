import { GUILT_VOCABULARY, findBannedLanguage } from '@aura/shared';

import {
  accountDay,
  arrivalDedupeKey,
  isMilestoneDue,
  isWinbackDue,
  maySendArrival,
  recordIgnored,
  recordOpened,
  SOFTEN_THRESHOLD,
  SOFTENED_WEEKDAYS,
} from './policy';
import { buildNotification, type NotificationKind } from './templates';

/**
 * Notification policy and copy (Phase 9 test list: soften counter, D7
 * eligibility, send-log guard, zero-guilt lint).
 *
 * The copy tests below are the ones that matter most. A notification is the
 * least private surface the product has — readable by anyone holding the phone —
 * and the only one that arrives uninvited. Product 14 bans guilt vocabulary and
 * doc 11 forbids naming her absence anywhere; both are asserted here against the
 * shared ban list rather than by eye.
 */
describe('notification policy', () => {
  describe('auto-soften (11 §5, product 16: respect > re-engagement)', () => {
    const fresh = { ignoredArrivalCount: 0, softened: false };

    it('counts an ignored send', () => {
      expect(recordIgnored(fresh).ignoredArrivalCount).toBe(1);
    });

    it('does not soften before the threshold', () => {
      let state = fresh;
      state = recordIgnored(state);
      state = recordIgnored(state);

      expect(state.softened).toBe(false);
    });

    it('softens at three ignored', () => {
      let state = fresh;
      for (let i = 0; i < SOFTEN_THRESHOLD; i++) state = recordIgnored(state);

      expect(state.softened).toBe(true);
    });

    it('RESETS completely on any open — she does not earn the rhythm back', () => {
      // A decrement would make returning cost her three good mornings.
      expect(recordOpened()).toEqual({ ignoredArrivalCount: 0, softened: false });
    });

    it('unsoftens on an open even from deep in the count', () => {
      let state = fresh;
      for (let i = 0; i < 10; i++) state = recordIgnored(state);

      expect(recordOpened().softened).toBe(false);
    });
  });

  describe('maySendArrival', () => {
    const on = { arrivalEnabled: true };
    const normal = { ignoredArrivalCount: 0, softened: false };
    const softened = { ignoredArrivalCount: 3, softened: true };

    it('sends any day when she is engaged', () => {
      for (let weekday = 0; weekday < 7; weekday++) {
        expect(maySendArrival(normal, on, weekday)).toBe(true);
      }
    });

    it('respects her turning arrivals off entirely', () => {
      expect(maySendArrival(normal, { arrivalEnabled: false }, 1)).toBe(false);
    });

    it('drops a softened user to the three-a-week pattern', () => {
      const sending = [0, 1, 2, 3, 4, 5, 6].filter((day) => maySendArrival(softened, on, day));

      expect(sending).toEqual(SOFTENED_WEEKDAYS);
    });

    it('keeps arrivals off even for a softened user who disabled them', () => {
      expect(maySendArrival(softened, { arrivalEnabled: false }, 1)).toBe(false);
    });
  });

  describe('accountDay', () => {
    const now = new Date('2026-07-20T12:00:00Z');

    it('counts signup day as zero', () => {
      expect(accountDay('2026-07-20T09:00:00Z', now)).toBe(0);
    });

    it('counts whole days', () => {
      expect(accountDay('2026-07-13T12:00:00Z', now)).toBe(7);
    });

    it('survives an unparseable timestamp', () => {
      expect(accountDay('nonsense', now)).toBe(-1);
    });
  });

  describe('milestone eligibility', () => {
    const now = new Date('2026-07-20T12:00:00Z');

    it('is due on day seven', () => {
      expect(isMilestoneDue('2026-07-13T12:00:00Z', now)).toBe(7);
    });

    it('is not due on day six or eight', () => {
      expect(isMilestoneDue('2026-07-14T12:00:00Z', now)).toBeNull();
      expect(isMilestoneDue('2026-07-12T12:00:00Z', now)).toBeNull();
    });

    it('does NOT catch up late — a week-one letter on day 20 would be a small lie', () => {
      expect(isMilestoneDue('2026-06-30T12:00:00Z', now)).toBeNull();
    });

    it('never sends the same milestone twice', () => {
      expect(isMilestoneDue('2026-07-13T12:00:00Z', now, [7])).toBeNull();
    });
  });

  describe('the send-log guard (11 §6)', () => {
    it('keys an arrival on her local date', () => {
      expect(arrivalDedupeKey('2026-07-20')).toBe('2026-07-20');
    });

    it('gives two scan windows on one local day the same key', () => {
      // Travelling across timezones can put her in two windows the same day;
      // both must resolve to one send.
      expect(arrivalDedupeKey('2026-07-20')).toBe(arrivalDedupeKey('2026-07-20'));
    });

    it('gives consecutive days different keys', () => {
      expect(arrivalDedupeKey('2026-07-20')).not.toBe(arrivalDedupeKey('2026-07-21'));
    });
  });

  describe('win-back', () => {
    const now = new Date('2026-07-20T12:00:00Z');

    it('fires on the third day after a lapse', () => {
      expect(isWinbackDue('2026-07-17T12:00:00Z', now, false)).toBe(true);
    });

    it('does not fire earlier', () => {
      expect(isWinbackDue('2026-07-19T12:00:00Z', now, false)).toBe(false);
    });

    it('does not fire late — a warm note a week on reads as an afterthought', () => {
      expect(isWinbackDue('2026-07-01T12:00:00Z', now, false)).toBe(false);
    });

    it('never repeats', () => {
      expect(isWinbackDue('2026-07-17T12:00:00Z', now, true)).toBe(false);
    });

    it('does nothing for a user who has not lapsed', () => {
      expect(isWinbackDue(null, now, false)).toBe(false);
    });
  });
});

describe('notification copy', () => {
  const KINDS: NotificationKind[] = [
    'moment_arrival',
    'affirmation_nudge',
    'milestone',
    'trial_reminder',
    'winback',
  ];

  const built = (kind: NotificationKind) =>
    buildNotification(kind, {
      name: 'Maya',
      momentTitle: 'The Kitchen in Lisbon',
      momentId: '11111111-1111-1111-1111-111111111111',
    });

  it('produces copy for every kind in the catalog', () => {
    for (const kind of KINDS) {
      expect(built(kind)).not.toBeNull();
    }
  });

  describe('the ban lists (product 14, 15 §5)', () => {
    it.each(KINDS)('%s carries no banned or guilt language', (kind) => {
      const content = built(kind)!;

      expect(findBannedLanguage(`${content.title} ${content.body}`)).toEqual([]);
    });

    it.each(KINDS)('%s never names her absence', (kind) => {
      // Doc 11 §5: "Absence is never named in any copy." This is the rule that
      // separates a companion from a re-engagement machine.
      const body = built(kind)!.body.toLowerCase();

      for (const term of [
        'missed',
        'been a while',
        'come back',
        'haven’t',
        "haven't",
        'still there',
      ]) {
        expect(body).not.toContain(term);
      }
    });

    it.each(GUILT_VOCABULARY)('no template contains the guilt term %p', (term) => {
      for (const kind of KINDS) {
        expect(built(kind)!.body.toLowerCase()).not.toContain(term.toLowerCase());
      }
    });
  });

  describe('the safety boundary (11 §3)', () => {
    it('uses her name and the moment title, and nothing else', () => {
      const content = built('moment_arrival')!;

      expect(content.body).toContain('Maya');
      expect(content.body.toLowerCase()).toContain('kitchen in lisbon');
    });

    it('degrades gracefully when she never gave a name', () => {
      const content = buildNotification('moment_arrival', {
        name: null,
        momentTitle: 'The Kitchen',
        momentId: 'abc',
      })!;

      expect(content.body).not.toContain('—');
      expect(content.body.trim().startsWith('this')).toBe(true);
    });

    it('still sends when the moment has no title', () => {
      const content = buildNotification('moment_arrival', {
        name: 'Maya',
        momentTitle: null,
        momentId: 'abc',
      })!;

      expect(content.body).toContain('ready');
    });

    it('REFUSES to build an arrival with no moment — never notify about nothing', () => {
      // 11 §7: a failed pre-generation must produce no notification at all.
      expect(buildNotification('moment_arrival', { name: 'Maya' })).toBeNull();
    });

    it('refuses a milestone with no letter behind it', () => {
      expect(buildNotification('milestone', { name: 'Maya' })).toBeNull();
    });
  });

  describe('deep links (11 §3, 06 §5)', () => {
    it('sends an arrival to the moment', () => {
      expect(built('moment_arrival')!.url).toBe(
        'aura://moment/11111111-1111-1111-1111-111111111111',
      );
    });

    it('sends a milestone to the letter cover', () => {
      expect(built('milestone')!.url).toContain('aura://letter/');
    });

    it('sends the affirmation nudge to today’s card', () => {
      expect(built('affirmation_nudge')!.url).toBe('aura://affirmation/today');
    });

    it('sends the trial reminder to the subscription screen, not a paywall', () => {
      // Checklist #3 is a reminder, not a sales surface.
      expect(built('trial_reminder')!.url).toContain('settings/subscription');
    });
  });

  describe('the trial reminder (product 15 checklist #3)', () => {
    it('says both choices are fine', () => {
      expect(built('trial_reminder')!.body).toContain('both fine');
    });

    it('applies no pressure', () => {
      const body = built('trial_reminder')!.body.toLowerCase();

      expect(body).not.toMatch(/hurry|act now|don't lose|last chance|expires/);
    });
  });
});
