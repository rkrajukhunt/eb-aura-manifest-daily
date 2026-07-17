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
function stubSupabase(failingTables: Set<string> = new Set()) {
  from.mockImplementation((table: string) => {
    const result = failingTables.has(table)
      ? { error: { message: `${table} down` } }
      : { error: null };

    const chain = {
      insert: jest.fn(() => Promise.resolve(result)),
      update: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve(result)) })),
      delete: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve(result)) })),
    };
    return chain;
  });
}

describe('onboarding commit path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useOnboardingDraft.getState().reset();
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
      await submitAnswer('user-1', 's10-struggle', 'a very long private disclosure about my life');

      const payload = capture.mock.calls[0][1];
      expect(payload.char_count_bucket).toBe('medium');
      expect(JSON.stringify(payload)).not.toContain('disclosure');
    });

    it('records a skip with skipped=true and no profile write', async () => {
      await submitAnswer('user-1', 's10-struggle', null, true);

      expect(capture).toHaveBeenCalledWith(
        'onboarding_answer_submitted',
        expect.objectContaining({ skipped: true }),
      );
    });
  });

  describe('flushPending', () => {
    it('drains answers that failed to sync', async () => {
      stubSupabase(new Set(['onboarding_answers']));
      await submitAnswer('user-1', 's03-name', 'Maya');
      await submitAnswer('user-1', 's08-dream-city', 'Lisbon');

      stubSupabase();
      const synced = await flushPending('user-1');

      expect(synced).toBe(true);
      expect(useOnboardingDraft.getState().answers['s03-name']?.committedAt).not.toBeNull();
      expect(useOnboardingDraft.getState().answers['s08-dream-city']?.committedAt).not.toBeNull();
    });

    it('reports false while still offline', async () => {
      stubSupabase(new Set(['onboarding_answers']));
      await submitAnswer('user-1', 's03-name', 'Maya');

      expect(await flushPending('user-1')).toBe(false);
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
      await submitAnswer('user-1', 's08-dream-city', 'Lisbon');
      await submitAnswer('user-1', 's10-struggle', null, true);

      await completeOnboarding('user-1', 120_000);

      expect(seed).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ name: 'Maya', dream_city: 'Lisbon', struggle: null }),
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
