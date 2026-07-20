import type { CadenceDirective, MemoryContext } from '../types';

/**
 * Test fixtures for the generation suites (15 §2).
 *
 * One canonical "Maya" context plus a letter body that passes all eight QA rules
 * cleanly. Every rule test starts from this passing baseline and breaks exactly
 * one thing — so a failure names the rule that broke rather than an accident of
 * fixture drift. `baselinePasses` in the QA suite guards the baseline itself.
 */
export function buildContext(overrides: Partial<MemoryContext> = {}): MemoryContext {
  return {
    name: 'Maya',
    selfDescription: 'someone who is quietly rebuilding',
    workFeeling: 'unseen',
    values: ['honesty', 'craft'],
    dreamHome: 'a small flat with a balcony',
    dreamCity: 'Lisbon',
    struggle: 'I feel invisible at work',
    people: [{ name: 'Nadia', descriptor: 'my sister' }],
    memoryItems: [
      {
        content: 'She walks by the river on Sundays',
        verbatim: null,
        category: 'ritual',
        tier: 'evolving',
      },
    ],
    exactPhrases: ['the quiet kind of brave', 'a kitchen with morning light'],
    neverInclude: ['Daniel'],
    recentGratitude: [],
    recentTitles: ['The Balcony'],
    directives: [],
    startedWeekday: 'Friday',
    startedMonth: 'July',
    ...overrides,
  };
}

export function directive(kind: CadenceDirective['kind'], item: string): CadenceDirective {
  return { kind, item } as CadenceDirective;
}

/**
 * A letter body that satisfies every rule: name in the first sentence, five
 * verbatim tokens available and three-plus used, 140–220 words, no banned or
 * never-include language, and a date-close whose date line sits third-from-last
 * (product 08's canonical shape — the case that caught the original QA bug).
 */
export const PASSING_LETTER_BODY = [
  'Maya, it is morning here in Lisbon and the light is doing the thing you always hoped it would do.',
  'I am you, some years on, writing back to you from a kitchen with morning light — the one you described',
  'long before you believed it could ever belong to you.',
  'Nadia calls on Sundays now.',
  'She laughs about how carefully you used to plan every single hour of every single day, and you laugh with her,',
  'because all of that planning was the quiet kind of brave.',
  'There was a season when the office made you feel small, when you sat in long meetings and wondered whether',
  'a single person in the room had heard you speak.',
  'I want you to know how that season ended.',
  'It did not end with an announcement or a title or a sudden reversal of fortune.',
  'It ended on an ordinary Tuesday, when you spoke first in a room full of people and realised, walking home,',
  'that your voice had been steady for months and you simply had not noticed.',
  'The flat smells like bread. The balcony door is open. The river is down there, patient.',
  'Everything you are building today is already on its way to becoming this.',
  'You started this on a Friday in July. I remember. Keep going.',
].join(' ');

/** A title with no sensitive-struggle words and no banned language. */
export const PASSING_LETTER_TITLE = 'The Kitchen in Lisbon';
