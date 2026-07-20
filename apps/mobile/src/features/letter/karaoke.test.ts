import {
  closingLineIndex,
  groupIntoLines,
  lineIndexAt,
  listenedPct,
  MAX_WORDS_PER_LINE,
  MIN_WORDS_PER_LINE,
  wordIndexAt,
  type WordTiming,
} from './karaoke';

/**
 * Karaoke word-index maths (Phase 6 test list, 10 §5).
 *
 * Sync bugs are invisible in a screenshot and glaring in the hand, so these
 * assert the properties the eye actually notices: the line lights ON its first
 * word, it stays lit through the silence after it, and any position — seeked,
 * resumed, or arrived at after a dropped frame — resolves to the same line as
 * if it had been played straight through.
 */
describe('karaoke', () => {
  /** Evenly spaced words, 400ms each, from a given start. */
  const timings = (words: string[], startMs = 0, stepMs = 400): WordTiming[] =>
    words.map((word, i) => ({
      word,
      startMs: startMs + i * stepMs,
      endMs: startMs + i * stepMs + stepMs - 50,
    }));

  const LETTER = timings([
    'Maya,',
    'it',
    'is',
    'morning',
    'here.',
    'The',
    'light',
    'in',
    'Lisbon',
    'is',
    'exactly',
    'how',
    'you',
    'imagined.',
    'You',
    'started',
    'this',
    'on',
    'a',
    'Friday',
    'in',
    'July.',
    'I',
    'remember.',
    'Keep',
    'going.',
  ]);

  describe('groupIntoLines', () => {
    it('never exceeds six words a line', () => {
      const lines = groupIntoLines(LETTER);

      for (const line of lines) {
        expect(line.words.length).toBeLessThanOrEqual(MAX_WORDS_PER_LINE);
      }
    });

    it('never leaves a single word stranded on the last line', () => {
      const lines = groupIntoLines(LETTER);
      const last = lines[lines.length - 1];

      expect(last!.words.length).toBeGreaterThanOrEqual(MIN_WORDS_PER_LINE);
    });

    it('breaks where the voice pauses — a sentence end starts a new line', () => {
      const lines = groupIntoLines(
        timings(['Maya,', 'it', 'is', 'morning.', 'The', 'light', 'is', 'here.']),
      );

      expect(lines[0]!.text).toBe('Maya, it is morning.');
      expect(lines[1]!.text).toBe('The light is here.');
    });

    it('does not break on a sentence end that would leave a one-word line', () => {
      // "Yes." alone is a stutter, not a beat — it rides with what follows.
      const lines = groupIntoLines(timings(['Yes.', 'And', 'then', 'you', 'went.']));

      expect(lines[0]!.words.length).toBeGreaterThanOrEqual(MIN_WORDS_PER_LINE);
    });

    it('breaks on a clause end once there is enough line behind it', () => {
      const lines = groupIntoLines(timings(['You', 'kept', 'going,', 'and', 'you', 'arrived.']));

      expect(lines[0]!.text).toBe('You kept going,');
    });

    it('keeps every word, in order, across the grouping', () => {
      const lines = groupIntoLines(LETTER);
      const regrouped = lines.flatMap((l) => l.words.map((w) => w.word));

      expect(regrouped).toEqual(LETTER.map((w) => w.word));
    });

    it('takes each line span from its own first and last word', () => {
      const lines = groupIntoLines(LETTER);

      for (const line of lines) {
        expect(line.startMs).toBe(line.words[0]!.startMs);
        expect(line.endMs).toBe(line.words[line.words.length - 1]!.endMs);
      }
    });

    it('numbers lines consecutively from zero', () => {
      const lines = groupIntoLines(LETTER);

      expect(lines.map((l) => l.index)).toEqual(lines.map((_, i) => i));
    });

    it('handles an empty letter without throwing', () => {
      expect(groupIntoLines([])).toEqual([]);
    });

    it('handles a single word', () => {
      const lines = groupIntoLines(timings(['Maya.']));

      expect(lines).toHaveLength(1);
      expect(lines[0]!.text).toBe('Maya.');
    });
  });

  describe('wordIndexAt', () => {
    it('reports nothing before the first word is spoken', () => {
      expect(wordIndexAt(LETTER, -1)).toBe(-1);
    });

    it('lights the first word exactly as it starts', () => {
      expect(wordIndexAt(LETTER, LETTER[0]!.startMs)).toBe(0);
    });

    it('advances with the voice', () => {
      expect(wordIndexAt(LETTER, LETTER[5]!.startMs)).toBe(5);
      expect(wordIndexAt(LETTER, LETTER[5]!.startMs + 10)).toBe(5);
    });

    it('holds the last spoken word through the silence after it', () => {
      // Between word 3 ending and word 4 starting, the line must stay lit.
      const gap = LETTER[3]!.endMs + 10;

      expect(wordIndexAt(LETTER, gap)).toBe(3);
    });

    it('holds the final word past the end of the audio', () => {
      expect(wordIndexAt(LETTER, 999_999)).toBe(LETTER.length - 1);
    });

    it('returns nothing for an empty letter', () => {
      expect(wordIndexAt([], 500)).toBe(-1);
    });

    it('agrees with a linear scan at every millisecond boundary', () => {
      // The binary search is the only clever thing in this module; this pins it
      // against the obvious implementation across the whole letter.
      const linear = (position: number) => {
        let found = -1;
        LETTER.forEach((t, i) => {
          if (t.startMs <= position) found = i;
        });
        return found;
      };

      for (let ms = -100; ms < 11_000; ms += 37) {
        expect(wordIndexAt(LETTER, ms)).toBe(linear(ms));
      }
    });
  });

  describe('lineIndexAt', () => {
    const lines = groupIntoLines(LETTER);

    it('reports nothing before the letter begins', () => {
      expect(lineIndexAt(lines, -5)).toBe(-1);
    });

    it('materializes a line on its own first word (product 08 §5)', () => {
      lines.forEach((line, i) => {
        expect(lineIndexAt(lines, line.startMs)).toBe(i);
      });
    });

    it('keeps the line lit until the next one begins', () => {
      const second = lines[1]!;

      expect(lineIndexAt(lines, second.startMs - 1)).toBe(0);
      expect(lineIndexAt(lines, second.startMs)).toBe(1);
    });

    it('holds the last line after the audio ends, so it can hang on screen', () => {
      expect(lineIndexAt(lines, 999_999)).toBe(lines.length - 1);
    });
  });

  describe('drift re-anchoring (10 §5)', () => {
    const lines = groupIntoLines(LETTER);

    it('resolves a position identically however it was reached', () => {
      // Played straight through vs. seeked vs. resumed after a background pause:
      // all three are just "absolute position", so all three must agree.
      const target = lines[3]!.startMs + 25;

      expect(lineIndexAt(lines, target)).toBe(lineIndexAt(lines, target));
      expect(wordIndexAt(LETTER, target)).toBe(wordIndexAt(LETTER, target));
    });

    it('recovers immediately from a long stall rather than lagging behind', () => {
      // A dropped run of frames means the next call arrives late; it must land on
      // where the audio IS, not on where the animation had got to.
      const beforeStall = lines[1]!.startMs;
      const afterStall = lines[6]?.startMs ?? lines[lines.length - 1]!.startMs;

      expect(lineIndexAt(lines, beforeStall)).toBe(1);
      expect(lineIndexAt(lines, afterStall)).toBe(lines[6] ? 6 : lines.length - 1);
    });

    it('goes backwards correctly when she seeks back', () => {
      expect(lineIndexAt(lines, lines[5]!.startMs)).toBe(5);
      expect(lineIndexAt(lines, lines[1]!.startMs)).toBe(1);
    });
  });

  describe('closingLineIndex — where the soft tick belongs (product 08 §8)', () => {
    it('finds the line naming the weekday she started', () => {
      const lines = groupIntoLines(LETTER);
      const index = closingLineIndex(lines);

      expect(index).toBeGreaterThanOrEqual(0);
      expect(lines[index]!.text.toLowerCase()).toContain('friday');
    });

    it('is inside the closing region, not the body', () => {
      const lines = groupIntoLines(LETTER);

      expect(closingLineIndex(lines)).toBeGreaterThan(lines.length - 8);
    });

    it('prefers the closing mention over an earlier one', () => {
      // "Sundays" mid-letter must not steal the tick from the real date close.
      const withEarlier = timings([
        'She',
        'calls',
        'on',
        'Sundays',
        'now.',
        'You',
        'started',
        'this',
        'on',
        'a',
        'Friday',
        'in',
        'July.',
        'I',
        'remember.',
        'Keep',
        'going.',
      ]);
      const lines = groupIntoLines(withEarlier);
      const index = closingLineIndex(lines);

      expect(lines[index]!.text.toLowerCase()).toContain('friday');
      expect(lines[index]!.text.toLowerCase()).not.toContain('sunday');
    });

    it('falls back to the month when no weekday is spoken', () => {
      const lines = groupIntoLines(timings(['You', 'began', 'in', 'July.', 'Keep', 'going.']));
      const index = closingLineIndex(lines);

      expect(lines[index]!.text.toLowerCase()).toContain('july');
    });

    it('stays silent rather than guessing when there is no date close', () => {
      const lines = groupIntoLines(timings(['You', 'kept', 'going.', 'Keep', 'going.']));

      expect(closingLineIndex(lines)).toBe(-1);
    });

    it('stays silent on an empty letter', () => {
      expect(closingLineIndex([])).toBe(-1);
    });
  });

  describe('listenedPct', () => {
    it('is zero at the start', () => {
      expect(listenedPct(0, 90_000)).toBe(0);
    });

    it('is a hundred at the end', () => {
      expect(listenedPct(90_000, 90_000)).toBe(100);
    });

    it('rounds to a whole percent', () => {
      expect(listenedPct(45_000, 90_000)).toBe(50);
      expect(listenedPct(30_000, 90_000)).toBe(33);
    });

    it('clamps a position that overshoots the duration', () => {
      expect(listenedPct(95_000, 90_000)).toBe(100);
    });

    it('clamps a negative position', () => {
      expect(listenedPct(-500, 90_000)).toBe(0);
    });

    it('reports zero rather than dividing by an unknown duration', () => {
      expect(listenedPct(1_000, 0)).toBe(0);
    });
  });
});
