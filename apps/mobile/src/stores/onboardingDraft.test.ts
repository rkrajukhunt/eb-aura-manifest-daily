import { pendingCommits, resumeScreen, useOnboardingDraft } from './onboardingDraft';

describe('onboarding draft', () => {
  beforeEach(() => {
    useOnboardingDraft.getState().reset();
  });

  describe('funnel clock', () => {
    it('starts once and refuses to restart — duration_s is a launch metric', () => {
      const store = useOnboardingDraft.getState();
      store.start(1000);
      useOnboardingDraft.getState().start(9999);

      expect(useOnboardingDraft.getState().startedAt).toBe(1000);
    });
  });

  describe('answers', () => {
    it('stores an answer as pending sync', () => {
      useOnboardingDraft.getState().setAnswer('s03-name', 'Maya');

      const answer = useOnboardingDraft.getState().answers['s03-name'];
      expect(answer).toEqual({ value: 'Maya', skipped: false, committedAt: null });
    });

    it('marks an answer committed', () => {
      useOnboardingDraft.getState().setAnswer('s03-name', 'Maya');
      useOnboardingDraft.getState().markCommitted('s03-name', '2026-07-17T10:00:00Z');

      expect(useOnboardingDraft.getState().answers['s03-name']?.committedAt).toBe(
        '2026-07-17T10:00:00Z',
      );
    });

    it('re-answering resets committedAt — the edited value has not synced', () => {
      const store = useOnboardingDraft.getState();
      store.setAnswer('s03-name', 'Maya');
      store.markCommitted('s03-name');

      useOnboardingDraft.getState().setAnswer('s03-name', 'Maya R.');

      expect(useOnboardingDraft.getState().answers['s03-name']?.committedAt).toBeNull();
    });

    it('records a skip distinctly from an answer', () => {
      useOnboardingDraft.getState().setAnswer('s10-struggle', null, true);

      expect(useOnboardingDraft.getState().answers['s10-struggle']?.skipped).toBe(true);
    });
  });

  describe('resume (product 07: kill mid-flow → exact-screen resume)', () => {
    it('resumes a fresh draft at the first screen', () => {
      expect(resumeScreen(useOnboardingDraft.getState())).toBe('s01-welcome');
    });

    it('resumes after the last answered screen', () => {
      const store = useOnboardingDraft.getState();
      store.setAnswer('s03-name', 'Maya');
      store.setAnswer('s04-self-description', 'restless in a good way');

      expect(resumeScreen(useOnboardingDraft.getState())).toBe('s05-work-feeling');
    });

    it('never pulls her backwards if she parked further along', () => {
      // She answered S4, moved to S5, read it, killed the app. Resume must not
      // rewind past where she actually was.
      const store = useOnboardingDraft.getState();
      store.setAnswer('s03-name', 'Maya');
      store.advanceTo('s07-dream-home');

      expect(resumeScreen(useOnboardingDraft.getState())).toBe('s07-dream-home');
    });

    it('treats a skip as answered for resume purposes', () => {
      const store = useOnboardingDraft.getState();
      store.setAnswer('s10-struggle', null, true);

      expect(resumeScreen(useOnboardingDraft.getState())).toBe('s11-arrival-time');
    });
  });

  describe('edit-guard (product 07: revise any answer, never restart)', () => {
    it('returns to where the conversation was after an edit', () => {
      const store = useOnboardingDraft.getState();
      store.advanceTo('s08-dream-city');

      useOnboardingDraft.getState().beginEdit('s03-name');
      expect(useOnboardingDraft.getState().currentScreen).toBe('s03-name');

      const returnedTo = useOnboardingDraft.getState().endEdit();

      expect(returnedTo).toBe('s08-dream-city');
      expect(useOnboardingDraft.getState().currentScreen).toBe('s08-dream-city');
    });

    it('keeps the original return point across a nested edit', () => {
      const store = useOnboardingDraft.getState();
      store.advanceTo('s09-people');

      useOnboardingDraft.getState().beginEdit('s03-name');
      useOnboardingDraft.getState().beginEdit('s04-self-description');
      useOnboardingDraft.getState().endEdit();

      expect(useOnboardingDraft.getState().currentScreen).toBe('s09-people');
    });

    it('does not move when no edit is in progress', () => {
      const store = useOnboardingDraft.getState();
      store.advanceTo('s05-work-feeling');

      expect(useOnboardingDraft.getState().endEdit()).toBeNull();
      expect(useOnboardingDraft.getState().currentScreen).toBe('s05-work-feeling');
    });

    it('editing an answer keeps every other answer untouched', () => {
      const store = useOnboardingDraft.getState();
      store.setAnswer('s03-name', 'Maya');
      store.setAnswer('s08-dream-city', 'Lisbon');

      useOnboardingDraft.getState().setAnswer('s03-name', 'Maya R.');

      expect(useOnboardingDraft.getState().answers['s08-dream-city']?.value).toBe('Lisbon');
    });
  });

  describe('offline queue (05 §3)', () => {
    it('lists uncommitted answers in screen order', () => {
      const store = useOnboardingDraft.getState();
      store.setAnswer('s08-dream-city', 'Lisbon');
      store.setAnswer('s03-name', 'Maya');
      store.markCommitted('s03-name');

      expect(pendingCommits(useOnboardingDraft.getState().answers)).toEqual(['s08-dream-city']);
    });

    it('is empty once everything synced', () => {
      const store = useOnboardingDraft.getState();
      store.setAnswer('s03-name', 'Maya');
      store.markCommitted('s03-name');

      expect(pendingCommits(useOnboardingDraft.getState().answers)).toEqual([]);
    });
  });

  it('reset returns to a fresh draft — deletion means a truly fresh state (14 §6)', () => {
    const store = useOnboardingDraft.getState();
    store.start(1000);
    store.setAnswer('s03-name', 'Maya');
    store.advanceTo('s09-people');

    useOnboardingDraft.getState().reset();

    const state = useOnboardingDraft.getState();
    expect(state.startedAt).toBeNull();
    expect(state.answers).toEqual({});
    expect(state.currentScreen).toBe('s01-welcome');
  });
});
