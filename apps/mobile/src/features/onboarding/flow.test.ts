import {
  framingOf,
  isBypassed,
  nextScreen,
  previousScreen,
  progressOf,
  QUESTION_SCREENS,
  SCREEN_ORDER,
  visibleQuestionScreens,
  type FlowAnswers,
} from './flow';

const answered = (entries: Record<string, unknown>): FlowAnswers =>
  Object.fromEntries(
    Object.entries(entries).map(([id, value]) => [id, { value, skipped: false }]),
  ) as FlowAnswers;

describe('onboarding v5 flow', () => {
  it('runs the design order end to end when nothing branches', () => {
    // One goal, no contradiction: priority, context and calibration all skipped.
    const a = answered({
      'a04-goals': ['Better habits'],
      'a05-feeling': 'okay',
      'a06-obstacle': 'I’m too busy',
      'q-belief': 'process',
    });
    expect(nextScreen('a02-value', undefined, a)).toBe('a04-goals');
    expect(nextScreen('a04-goals', undefined, a)).toBe('s03-name');
    expect(nextScreen('q-belief', undefined, a)).toBe('v-reflect');
    expect(nextScreen('v-consent', undefined, a)).toBe('s12-notifications');
    expect(nextScreen('s12-notifications', undefined, a)).toBeNull();
  });

  it('asks for a priority only when more than one goal was picked', () => {
    expect(
      nextScreen(
        'a04-goals',
        undefined,
        answered({ 'a04-goals': ['Career & purpose', 'Calm & less anxiety'] }),
      ),
    ).toBe('q-priority');
    expect(
      nextScreen('a04-goals', undefined, answered({ 'a04-goals': ['Career & purpose'] })),
    ).toBe('q-context');
  });

  it('skips the context question for habits — the design has no variant for it', () => {
    const a = answered({
      'a04-goals': ['Calm & less anxiety', 'Better habits'],
      'q-priority': 'Better habits',
    });
    expect(nextScreen('q-priority', undefined, a)).toBe('s03-name');
    expect(isBypassed('q-context', a)).toBe(true);
  });

  it('shows calibration only on a contradiction', () => {
    // Not gentle + practical + self-doubt → contradiction.
    const contradiction = answered({
      'a05-feeling': 'good',
      'a06-obstacle': 'Self-doubt',
      'q-belief': 'practical',
    });
    expect(nextScreen('q-belief', undefined, contradiction)).toBe('q-calibration');

    // Gentle + identity → contradiction (the identity card is hidden, but a
    // stale edit can still land there).
    const gentle = answered({ 'a05-feeling': 'low', 'q-belief': 'identity' });
    expect(nextScreen('q-belief', undefined, gentle)).toBe('q-calibration');

    const plain = answered({ 'a05-feeling': 'good', 'q-belief': 'process' });
    expect(nextScreen('q-belief', undefined, plain)).toBe('v-reflect');
  });

  it('walks back over the same bypassed screens', () => {
    const a = answered({ 'a04-goals': ['Better habits'], 'q-belief': 'process' });
    expect(previousScreen('s03-name', undefined, a)).toBe('a04-goals');
    expect(previousScreen('v-reflect', undefined, a)).toBe('q-belief');
    expect(previousScreen('a04-goals', undefined, a)).toBe('a02-value');
    expect(previousScreen('a01-splash')).toBeNull();
  });

  it('still honours experiment-hidden screens in both directions', () => {
    const hidden = new Set(['q-offlimits'] as const);
    expect(nextScreen('q-lexicon', hidden)).toBe('q-belief');
    expect(previousScreen('q-belief', hidden)).toBe('q-lexicon');
  });

  it('drops bypassed questions from the progress denominator', () => {
    const a = answered({ 'a04-goals': ['Better habits'] });
    // q-priority, q-context and q-calibration all bypassed.
    expect(visibleQuestionScreens(undefined, a).length).toBe(QUESTION_SCREENS.length - 3);
  });

  it('draws the track from the first question to the consent, never elsewhere', () => {
    expect(progressOf('a01-splash')).toBeNull();
    expect(progressOf('a02-value')).toBeNull();
    expect(progressOf('s12-notifications')).toBeNull();
    expect(progressOf('a04-goals')).toBeGreaterThan(0);
    expect(progressOf('v-consent')).toBe(1);
    // Two goals add the priority question, so the same screen sits earlier on the track.
    const a = answered({ 'a04-goals': ['Career & purpose', 'Calm & less anxiety'] });
    expect(progressOf('a04-goals', undefined, a)).toBeLessThan(progressOf('a04-goals') ?? 1);
  });

  it('counts only answer-carrying screens — a beat inherits the last question', () => {
    // Default walk (one goal): q-priority, q-context, q-calibration bypassed.
    const questionOnlyTrackLength = visibleQuestionScreens(undefined, {}).filter(
      (s) => SCREEN_ORDER.indexOf(s) <= SCREEN_ORDER.indexOf('v-consent'),
    ).length;
    // a11-affirmation is a beat: it draws a header but never advances it.
    expect(progressOf('a11-affirmation')).toBe(progressOf('s03-name'));
    // And the whole track is question screens only — the denominator above.
    expect(progressOf('v-insight')).toBe(progressOf('a05-feeling'));
    expect(questionOnlyTrackLength).toBeGreaterThan(0);
  });

  it('softens the framing to process in gentle mode or after a false calibration', () => {
    expect(framingOf(answered({ 'q-belief': 'identity', 'a05-feeling': 'low' }))).toBe('process');
    expect(framingOf(answered({ 'q-belief': 'identity', 'q-calibration': 'fake' }))).toBe(
      'process',
    );
    expect(framingOf(answered({ 'q-belief': 'practical', 'a05-feeling': 'good' }))).toBe(
      'practical',
    );
    expect(framingOf({})).toBe('process');
  });

  it('has no duplicate or retired ids in the live order', () => {
    expect(new Set(SCREEN_ORDER).size).toBe(SCREEN_ORDER.length);
    expect(SCREEN_ORDER).not.toContain('a03-social-proof');
  });
});
