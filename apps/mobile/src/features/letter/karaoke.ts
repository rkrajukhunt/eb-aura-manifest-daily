import { hasMonth, hasWeekday } from '@aura/shared';

/**
 * Karaoke sync maths (10 §5, product 08 §5).
 *
 * Deliberately pure and free of Reanimated, React and the player: the renderer
 * calls these from a worklet on every frame, and the whole wow rests on them
 * being right. Sync errors are invisible in a screenshot and obvious in the
 * hand, so this module is the one place the behaviour is pinned by tests.
 *
 * Everything here is a function of ABSOLUTE position. Nothing accumulates a
 * delta, which is what makes the renderer self-correcting: a dropped frame, a
 * background pause, or a seek re-anchors on the next call rather than drifting
 * further out (10 §5 "drift guard").
 */

export interface WordTiming {
  word: string;
  startMs: number;
  endMs: number;
}

export interface KaraokeLine {
  index: number;
  text: string;
  words: WordTiming[];
  startMs: number;
  endMs: number;
}

/** 2–6 words per line (product 08 §5). Below 2 reads as a stutter; above 6 breaks the rhythm. */
export const MIN_WORDS_PER_LINE = 2;
export const MAX_WORDS_PER_LINE = 6;

/**
 * How far back from the end to look for the date-close line. The canonical close
 * ("You started this on a Friday in July. I remember. Keep going.") is 3–5 lines
 * at this grouping. Bounding the search means a weekday mentioned mid-letter
 * ("she calls on Sundays") cannot steal the closing tick.
 */
const CLOSING_REGION_LINES = 8;

const ENDS_SENTENCE = /[.!?]["'”’)\]]?$/;
const ENDS_CLAUSE = /[,;:—–]["'”’)\]]?$/;

/**
 * Groups word timings into display lines, breaking on natural speech pauses.
 *
 * The break rules, in priority order: never exceed 6 words; prefer to break
 * where the voice already pauses (sentence end, then clause end) so the line
 * change lands ON a breath rather than across one. A trailing single-word orphan
 * is folded back into the previous line — one word alone on screen reads as a
 * mistake, not as emphasis.
 */
export function groupIntoLines(timings: WordTiming[]): KaraokeLine[] {
  const lines: KaraokeLine[] = [];
  let current: WordTiming[] = [];

  const flush = () => {
    if (current.length === 0) return;
    lines.push(toLine(current, lines.length));
    current = [];
  };

  for (const timing of timings) {
    current.push(timing);

    if (current.length >= MAX_WORDS_PER_LINE) {
      flush();
      continue;
    }
    if (current.length < MIN_WORDS_PER_LINE) continue;

    if (ENDS_SENTENCE.test(timing.word)) {
      flush();
      continue;
    }
    // A clause break is a weaker pause, so it needs a little more line behind it
    // to be worth taking — otherwise commas shred the letter into fragments.
    if (ENDS_CLAUSE.test(timing.word) && current.length > MIN_WORDS_PER_LINE) {
      flush();
    }
  }

  flush();

  return foldTrailingOrphan(lines);
}

/**
 * Index of the word being spoken at `positionMs`, or -1 before the first word.
 *
 * Binary search — the renderer calls this every frame over a ~200-word letter,
 * and a linear scan would be doing 200 comparisons 60 times a second for no
 * reason. In the silence BETWEEN two words this returns the word that just
 * finished, which is what keeps its line lit through the pause instead of
 * flickering off.
 */
export function wordIndexAt(timings: WordTiming[], positionMs: number): number {
  return lastIndexStartingAtOrBefore(timings, positionMs);
}

/** Index of the line being spoken at `positionMs`, or -1 before the first line. */
export function lineIndexAt(lines: KaraokeLine[], positionMs: number): number {
  return lastIndexStartingAtOrBefore(lines, positionMs);
}

/**
 * The line carrying the dynamic date close (product 08 §8) — where the letter's
 * one soft haptic tick belongs. Returns -1 when the letter has no date close, in
 * which case no tick fires: a missing beat is silent, never guessed at.
 *
 * Searches backwards from the end so the CLOSING mention wins over any earlier
 * one, and prefers the weekday (which the close leads with) over the month.
 */
export function closingLineIndex(lines: KaraokeLine[]): number {
  const first = Math.max(0, lines.length - CLOSING_REGION_LINES);
  const region = lines.slice(first);

  for (let i = region.length - 1; i >= 0; i--) {
    if (hasWeekday(region[i]?.text ?? '')) return first + i;
  }
  for (let i = region.length - 1; i >= 0; i--) {
    if (hasMonth(region[i]?.text ?? '')) return first + i;
  }
  return -1;
}

/**
 * How much of the letter she actually heard, 0–100 (product 08 analytics).
 * Clamped both ends: a position past the duration is a rounding artefact, not
 * 103% of a letter.
 */
export function listenedPct(positionMs: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  const raw = (positionMs / durationMs) * 100;
  return Math.round(Math.min(100, Math.max(0, raw)));
}

/** Shared binary search: last element whose `startMs` is ≤ position. */
function lastIndexStartingAtOrBefore(items: { startMs: number }[], positionMs: number): number {
  let low = 0;
  let high = items.length - 1;
  let found = -1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const start = items[mid]?.startMs ?? 0;

    if (start <= positionMs) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return found;
}

function toLine(words: WordTiming[], index: number): KaraokeLine {
  return {
    index,
    text: words.map((w) => w.word).join(' '),
    words,
    startMs: words[0]?.startMs ?? 0,
    endMs: words[words.length - 1]?.endMs ?? 0,
  };
}

/** Folds a trailing one-word line back into its predecessor where there is room. */
function foldTrailingOrphan(lines: KaraokeLine[]): KaraokeLine[] {
  if (lines.length < 2) return lines;

  const last = lines[lines.length - 1];
  const previous = lines[lines.length - 2];
  if (!last || !previous) return lines;
  if (last.words.length !== 1 || previous.words.length >= MAX_WORDS_PER_LINE) return lines;

  const merged = toLine([...previous.words, ...last.words], previous.index);
  return [...lines.slice(0, -2), merged];
}
