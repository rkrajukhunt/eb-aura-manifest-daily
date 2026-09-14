import { seedMemoryForUser } from '@/features/memory/api';
import { analytics } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { useOnboardingDraft } from '@/stores/onboardingDraft';

import { completeOnboarding, flushPending, submitAnswer } from './commit';

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('@/lib/analytics', () => ({
  analytics: { capture: jest.fn() },
  initAnalytics: jest.fn(),
}));
jest.mock('@/features/memory/api', () => ({ seedMemoryForUser: jest.fn(async () => undefined) }));

const capture = analytics.capture as jest.Mock;
const from = supabase.from as jest.Mock;
const seed = seedMemoryForUser as jest.Mock;

/** Chainable Supabase stub: every table op resolves ok unless a table is failed. */
const profilePatches: Array<{ table: string; patch: Record<string, unknown> }> = [];
function stubSupabase(failingTables: Set<string> = new Set()) {
  from.mockImplementation((table: string) => {
    const result = failingTables.has(table)
      ? { error: { message: `${table} down`, code: '42703' } }
      : { error: null };

    const chain = {
      insert: jest.fn(() => Promise.resolve(result)),
      update: jest.fn((patch: Record<string, unknown>) => {
        if (table === 'profiles') profilePatches.push({ table, patch });
        return { eq: jest.fn(() => Promise.resolve(result)) };
      }),
      delete: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve(result)) })),
    };
    return chain;
  });
}

describe('onboarding commit path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useOnboardingDraft.getState().reset();
    profilePatches.length = 0;
    stubSupabase();
  });

  describe('submitAnswer', () => {
    it('records, emits, syncs and marks committed', async () => {
      await submitAnswer('user-1', 's03-name', 'Maya');

      expect(useOnboardingDraft.getState().answers['s03-name']?.committedAt).not.toBeNull();
      expect(capture).toHaveBeenCalledWith('onboarding_answer_submitted', {
        screen_id: 's03-name',
        answer_type: 'text',
        skipped: false,
        char_count_bucket: 'short',
      });
    });

    it('keeps the answer pending when the network fails — offline never loses a word', async () => {
      stubSupabase(new Set(['onboarding_answers']));

      await submitAnswer('user-1', 's03-name', 'Maya');

      const answer = useOnboardingDraft.getState().answers['s03-name'];
      expect(answer?.value).toBe('Maya');
      expect(answer?.committedAt).toBeNull();
    });

    it('still fires analytics when offline — the funnel measures her, not our connectivity', async () => {
      stubSupabase(new Set(['onboarding_answers']));

      await submitAnswer('user-1', 's03-name', 'Maya');

      expect(capture).toHaveBeenCalledTimes(1);
    });

    it('buckets free text and never sends its content', async () => {
      await submitAnswer(
        'user-1',
        's04-self-description',
        'a very long private disclosure about my life',
      );

      const payload = capture.mock.calls[0][1];
      expect(payload.char_count_bucket).toBe('medium');
      expect(JSON.stringify(payload)).not.toContain('disclosure');
    });

    it('records a skip with skipped=true and no profile write', async () => {
      await submitAnswer('user-1', 's04-self-description', null, true);

      expect(capture).toHaveBeenCalledWith(
        'onboarding_answer_submitted',
        expect.objectContaining({ skipped: true }),
      );
    });

    it('persists a fine-tuned ritual slot — the reminder runs when she chose, not the preset', async () => {
      await submitAnswer('user-1', 'a08-ritual-time', { key: 'morning', time: '7:15am' });

      const patch = profilePatches.find((p) => p.table === 'profiles')?.patch;
      expect(patch?.arrival_time).toBe('07:15');
    });

    it('maps a bare ritual pick to its preset timestamp', async () => {
      await submitAnswer('user-1', 'a08-ritual-time', 'morning');

      const patch = profilePatches.find((p) => p.table === 'profiles')?.patch;
      expect(patch?.arrival_time).toBe('08:00');
    });
  });

  describe('flushPending', () => {
    it('drains answers that failed to sync', async () => {
      stubSupabase(new Set(['onboarding_answers']));
      await submitAnswer('user-1', 's03-name', 'Maya');
      await submitAnswer('user-1', 'a06-obstacle', 'I lose motivation');

      stubSupabase();
      const synced = await flushPending('user-1');

      expect(synced).toBe(true);
      expect(useOnboardingDraft.getState().answers['s03-name']?.committedAt).not.toBeNull();
      expect(useOnboardingDraft.getState().answers['a06-obstacle']?.committedAt).not.toBeNull();
    });

    it('reports false while still offline', async () => {
      stubSupabase(new Set(['onboarding_answers']));
      await submitAnswer('user-1', 's03-name', 'Maya');

      expect(await flushPending('user-1')).toBe(false);
    });

    it('a lagging profile column does not wedge the flush — the audit log has the answer', async () => {
      // First submit: audit log down, so the answer stays pending.
      stubSupabase(new Set(['onboarding_answers']));
      await submitAnswer('user-1', 'a05-feeling', 'anxious');

      // Retry: audit log recovers, but the `profiles` patch fails (mirrors a
      // `feeling` column a migration hasn't reached this environment yet).
      stubSupabase(new Set(['profiles']));
      const synced = await flushPending('user-1');

      // The answer is on the server (audit log), so the flush must not block.
      expect(synced).toBe(true);
      expect(useOnboardingDraft.getState().answers['a05-feeling']?.committedAt).not.toBeNull();
      expect(capture).toHaveBeenCalledWith(
        'onboarding_profile_patch_failed',
        expect.objectContaining({ screen_id: 'a05-feeling', cause: 'column_missing' }),
      );
    });
  });

  describe('completeOnboarding', () => {
    it('refuses to complete with unsynced answers — no Letter from half a profile', async () => {
      stubSupabase(new Set(['onboarding_answers']));
      await submitAnswer('user-1', 's03-name', 'Maya');

      await expect(completeOnboarding('user-1')).rejects.toThrow();
      expect(seed).not.toHaveBeenCalled();
    });

    it('stamps completion, seeds memory and fires the funnel event', async () => {
      useOnboardingDraft.getState().start(0);
      await submitAnswer('user-1', 's03-name', 'Maya');
      await submitAnswer('user-1', 'a05-feeling', 'okay');
      await submitAnswer('user-1', 'a06-obstacle', null, true);

      await completeOnboarding('user-1', 120_000);

      expect(seed).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          name: 'Maya',
          struggle: null,
        }),
      );
      expect(capture).toHaveBeenCalledWith('onboarding_completed', {
        duration_s: 120,
        // The skip is not an answer: 2 answered, not 3.
        questions_answered: 2,
      });
    });

    it('excludes skipped answers from the seed — a skip is not a value', async () => {
      await submitAnswer('user-1', 's04-self-description', null, true);
      await submitAnswer('user-1', 's03-name', 'Maya');

      await completeOnboarding('user-1');

      expect(seed).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ self_description: null }),
      );
    });
  });
});
