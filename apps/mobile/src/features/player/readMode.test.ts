import { groupIntoLines, type WordTiming } from '@/features/letter/karaoke';

import { toSentences } from './ReadMode';

/**
 * Read mode's sentence grouping (10 §5: "sentence-level highlight for Read mode").
 *
 * Deliberately coarser than the Letter's karaoke, and the reason is worth
 * stating: word-level highlighting is right for a performance you are hearing
 * for the first time, and a metronome when you are reading. The grouping below
 * is what makes reading feel like reading.
 */
describe('toSentences', () => {
  const timings = (words: string[]): WordTiming[] =>
    words.map((word, i) => ({ word, startMs: i * 400, endMs: i * 400 + 350 }));

  it('splits on sentence endings', () => {
    const lines = groupIntoLines(
      timings(['Maya,', 'it', 'is', 'morning.', 'The', 'light', 'is', 'here.']),
    );

    expect(toSentences(lines, '').map((s) => s.text)).toEqual([
      'Maya, it is morning.',
      'The light is here.',
    ]);
  });

  it('takes each sentence’s start from its first word', () => {
    const lines = groupIntoLines(timings(['One.', 'Two', 'three.']));
    const sentences = toSentences(lines, '');

    expect(sentences[0]!.startMs).toBe(0);
    expect(sentences[1]!.startMs).toBe(400);
  });

  it('keeps a trailing fragment that never terminates', () => {
    // A body that ends mid-thought must still be readable in full.
    const lines = groupIntoLines(timings(['She', 'kept', 'going']));

    expect(toSentences(lines, '').map((s) => s.text)).toEqual(['She kept going']);
  });

  it('handles question and exclamation endings', () => {
    const lines = groupIntoLines(timings(['Are', 'you', 'ready?', 'You', 'are.']));

    expect(toSentences(lines, '')).toHaveLength(2);
  });

  it('does not split on a closing quote after the stop', () => {
    const lines = groupIntoLines(timings(['She', 'said', '"go."', 'And', 'she', 'went.']));

    expect(toSentences(lines, '')).toHaveLength(2);
  });

  it('preserves every word across the regrouping', () => {
    const words = ['Maya,', 'it', 'is', 'morning.', 'The', 'light', 'is', 'here.'];
    const lines = groupIntoLines(timings(words));

    const regrouped = toSentences(lines, '')
      .map((sentence) => sentence.text)
      .join(' ')
      .split(/\s+/);

    expect(regrouped).toEqual(words);
  });

  describe('when there are no timings at all', () => {
    it('falls back to the raw body — a moment with no audio is still readable', () => {
      // Losing the text because the sync data is missing would be losing the
      // content over a detail.
      expect(toSentences([], 'The morning it changed.')).toEqual([
        { text: 'The morning it changed.', startMs: 0 },
      ]);
    });

    it('returns nothing for an empty body', () => {
      expect(toSentences([], '   ')).toEqual([]);
    });
  });
});
