import { kv, STORAGE_KEYS } from '@/lib/storage';

import { bumpAttempt, derivePhase, idempotencyKeyFor, readAttempt } from './generationState';

/**
 * The ritual's decision logic.
 *
 * The attempt counter is the piece worth the most attention: the backend dedupes
 * a replayed idempotency key to the same job, so getting this wrong turns "try
 * again" into a button that re-serves the same failure forever.
 */
describe('generationState', () => {
  beforeEach(() => kv.delete(STORAGE_KEYS.letterAttempt));

  describe('idempotencyKeyFor', () => {
    it('scopes the key to the user and the attempt', () => {
      expect(idempotencyKeyFor('user-1', 1)).toBe('letter:user-1:1');
    });

    it('gives different attempts different keys — this is what lets a retry retry', () => {
      expect(idempotencyKeyFor('user-1', 1)).not.toBe(idempotencyKeyFor('user-1', 2));
    });

    it('gives different users different keys', () => {
      expect(idempotencyKeyFor('user-1', 1)).not.toBe(idempotencyKeyFor('user-2', 1));
    });

    it('is stable for the same user and attempt — a dropped response must not double-generate', () => {
      expect(idempotencyKeyFor('user-1', 3)).toBe(idempotencyKeyFor('user-1', 3));
    });
  });

  describe('readAttempt', () => {
    it('starts at one', () => {
      expect(readAttempt()).toBe(1);
    });

    it('persists the first attempt so a relaunch resumes it', () => {
      readAttempt();

      expect(kv.get<number>(STORAGE_KEYS.letterAttempt)).toBe(1);
    });

    it('returns the stored attempt on a later call', () => {
      kv.set(STORAGE_KEYS.letterAttempt, 4);

      expect(readAttempt()).toBe(4);
    });

    it('is stable across repeated reads — reading is not retrying', () => {
      expect(readAttempt()).toBe(1);
      expect(readAttempt()).toBe(1);
      expect(readAttempt()).toBe(1);
    });

    it.each([0, -3, Number.NaN])('recovers from a corrupt stored value %p', (stored) => {
      kv.set(STORAGE_KEYS.letterAttempt, stored);

      expect(readAttempt()).toBe(1);
    });
  });

  describe('bumpAttempt', () => {
    it('moves to the next attempt', () => {
      expect(bumpAttempt()).toBe(2);
    });

    it('persists it', () => {
      bumpAttempt();

      expect(kv.get<number>(STORAGE_KEYS.letterAttempt)).toBe(2);
    });

    it('keeps climbing across repeated failures', () => {
      expect(bumpAttempt()).toBe(2);
      expect(bumpAttempt()).toBe(3);
      expect(bumpAttempt()).toBe(4);
    });

    it('produces a fresh key each time, so no retry can be deduped to a dead job', () => {
      const keys = [
        idempotencyKeyFor('user-1', readAttempt()),
        idempotencyKeyFor('user-1', bumpAttempt()),
        idempotencyKeyFor('user-1', bumpAttempt()),
      ];

      expect(new Set(keys).size).toBe(3);
    });
  });

  describe('derivePhase', () => {
    it('is working before any job exists', () => {
      expect(derivePhase(undefined, false)).toBe('working');
    });

    it.each(['queued', 'running', 'retrying'] as const)(
      'is working while the job is %s',
      (status) => {
        expect(derivePhase({ status, momentId: null }, false)).toBe('working');
      },
    );

    it('is ready once the job succeeds with a moment', () => {
      expect(derivePhase({ status: 'succeeded', momentId: 'moment-1' }, false)).toBe('ready');
    });

    it('stays working on a success with no moment rather than opening an empty Letter', () => {
      expect(derivePhase({ status: 'succeeded', momentId: null }, false)).toBe('working');
    });

    it.each(['failed', 'qa_failed'] as const)('is failed when the job ends %s', (status) => {
      expect(derivePhase({ status, momentId: null }, false)).toBe('failed');
    });

    it('is failed when the request never got out at all', () => {
      expect(derivePhase(undefined, true)).toBe('failed');
    });

    it('lets a request failure win over an in-flight job', () => {
      expect(derivePhase({ status: 'running', momentId: null }, true)).toBe('failed');
    });
  });
});
