import type { MemoryContext } from '../types';
import { buildContext } from './memory-context.fixture';

/**
 * The 20 golden personas (15 §5), spread across product 02's three archetypes —
 * the Quiet Dreamer (primary), the Self-Improver, and the Manifestation Believer.
 *
 * They exist to be ADVERSARIAL about shape, not to be realistic prose: accents
 * and apostrophes in names, regex metacharacters in excluded terms, phrases that
 * collide with banned vocabulary, one-word cities, very long free text. Each is
 * fully onboarded (name + city + a person + a phrase) so a letter can legitimately
 * clear the ≥3 verbatim-token floor — the sparse cases are asserted separately,
 * where the correct behaviour is rejection rather than a leak.
 */
export interface Persona {
  id: string;
  archetype: 'quiet_dreamer' | 'self_improver' | 'believer';
  context: MemoryContext;
}

const persona = (
  id: string,
  archetype: Persona['archetype'],
  overrides: Partial<MemoryContext>,
): Persona => ({ id, archetype, context: buildContext(overrides) });

export const PERSONAS: Persona[] = [
  persona('maya-marketing', 'quiet_dreamer', {
    name: 'Maya',
    dreamCity: 'Lisbon',
    people: [{ name: 'Nadia', descriptor: 'my sister' }],
    exactPhrases: ['the quiet kind of brave'],
    struggle: 'I feel invisible at work',
  }),
  persona('aisha-nurse', 'quiet_dreamer', {
    name: 'Aisha',
    dreamCity: 'Marrakesh',
    people: [{ name: 'Yusuf', descriptor: 'my son' }],
    exactPhrases: ['a house that breathes'],
    struggle: 'I am tired in a way sleep does not fix',
  }),
  persona('siobhan-apostrophe', 'quiet_dreamer', {
    // An apostrophe in the name — a naive regex build would throw or mis-match.
    name: "Siobhán O'Leary",
    dreamCity: 'Galway',
    people: [{ name: "Ma'ire", descriptor: 'my oldest friend' }],
    exactPhrases: ["a life that isn't borrowed"],
    struggle: 'I keep shrinking myself to fit',
  }),
  persona('yuki-tokyo', 'quiet_dreamer', {
    name: 'Yuki',
    dreamCity: 'Kyoto',
    people: [{ name: 'Haru', descriptor: 'my partner' }],
    exactPhrases: ['mornings that belong to me'],
    struggle: 'I do not know who I am outside of work',
  }),
  persona('rosa-single-word', 'quiet_dreamer', {
    name: 'Rosa',
    dreamCity: 'Oslo',
    people: [{ name: 'Ana', descriptor: null }],
    exactPhrases: ['enough'],
    struggle: 'money is always the thing',
  }),
  persona('chidi-lagos', 'quiet_dreamer', {
    name: 'Chidi',
    dreamCity: 'Lagos',
    people: [{ name: 'Ngozi', descriptor: 'my mother' }],
    exactPhrases: ['building something that outlasts me'],
    struggle: 'I carry everyone and no one carries me',
  }),
  persona('elena-longtext', 'quiet_dreamer', {
    name: 'Elena',
    dreamCity: 'Buenos Aires',
    people: [{ name: 'Mateo', descriptor: 'my brother, who always believed it' }],
    exactPhrases: [
      'a kitchen where people stay late and nobody looks at the time because the night is ours',
    ],
    struggle: 'I have been waiting for permission that is never going to arrive',
  }),

  persona('sam-structured', 'self_improver', {
    name: 'Sam',
    dreamCity: 'Copenhagen',
    people: [{ name: 'Jo', descriptor: 'my coach' }],
    exactPhrases: ['practice over motivation'],
    struggle: 'I start things and abandon them',
  }),
  persona('grace-gratitude', 'self_improver', {
    name: 'Grace',
    dreamCity: 'Vancouver',
    people: [{ name: 'Theo', descriptor: 'my husband' }],
    exactPhrases: ['small and steady'],
    struggle: 'journaling turns into another chore I fail at',
  }),
  persona('priya-meditator', 'self_improver', {
    name: 'Priya',
    dreamCity: 'Rishikesh',
    people: [{ name: 'Amma', descriptor: 'my grandmother' }],
    exactPhrases: ['stillness I can keep'],
    struggle: 'my mind will not sit down',
  }),
  persona('noor-metachar', 'self_improver', {
    name: 'Noor',
    dreamCity: 'Amman',
    people: [{ name: 'Layla', descriptor: 'my sister' }],
    exactPhrases: ['a quieter kind of ambition'],
    // Regex metacharacters in an excluded term — must be escaped, not compiled.
    neverInclude: ['a.b*c', '(ex)', '[old job]'],
    struggle: 'I measure myself against people I do not even admire',
  }),
  persona('tomas-runner', 'self_improver', {
    name: 'Tomas',
    dreamCity: 'Ljubljana',
    people: [{ name: 'Eva', descriptor: 'my daughter' }],
    exactPhrases: ['one more honest mile'],
    struggle: 'I am afraid of slowing down',
  }),
  persona('ingrid-nofriends', 'self_improver', {
    name: 'Ingrid',
    dreamCity: 'Reykjavik',
    people: [{ name: 'Birta', descriptor: null }],
    exactPhrases: ['the version of me who writes'],
    struggle: null, // She skipped S10 — the sensitive path must handle absence.
  }),

  persona('bea-burned', 'believer', {
    name: 'Bea',
    dreamCity: 'Seville',
    people: [{ name: 'Rocio', descriptor: 'my best friend' }],
    exactPhrases: ['I am done asking nicely'],
    struggle: 'every app I tried wanted my money before it knew my name',
  }),
  persona('kayla-loa', 'believer', {
    name: 'Kayla',
    dreamCity: 'Austin',
    people: [{ name: 'Dre', descriptor: 'my partner' }],
    exactPhrases: ['abundance that shows up as rent paid'],
    struggle: 'I keep manifesting and nothing lands',
  }),
  persona('fatima-369', 'believer', {
    name: 'Fatima',
    dreamCity: 'Istanbul',
    people: [{ name: 'Emel', descriptor: 'my aunt' }],
    exactPhrases: ['written down until it is true'],
    struggle: 'I am scared this is all just wishing',
  }),
  persona('dana-skeptic', 'believer', {
    name: 'Dana',
    dreamCity: 'Tel Aviv',
    people: [{ name: 'Ori', descriptor: 'my roommate' }],
    exactPhrases: ['proof, not vibes'],
    struggle: 'I do not trust anything that sounds this good',
  }),
  persona('leilani-island', 'believer', {
    name: 'Leilani',
    dreamCity: 'Hilo',
    people: [{ name: 'Kai', descriptor: 'my cousin' }],
    exactPhrases: ['home without asking permission'],
    struggle: 'leaving feels like betrayal',
  }),
  persona('marta-lots-of-people', 'believer', {
    name: 'Marta',
    dreamCity: 'Kraków',
    people: [
      { name: 'Piotr', descriptor: 'my husband' },
      { name: 'Zofia', descriptor: 'my daughter' },
      { name: 'Ola', descriptor: 'my sister' },
    ],
    exactPhrases: ['a table with everyone at it', 'no more counting pennies'],
    struggle: 'I am the only one holding it together',
  }),
  persona('nia-minimal-extras', 'believer', {
    name: 'Nia',
    dreamCity: 'Accra',
    people: [{ name: 'Kofi', descriptor: 'my father' }],
    exactPhrases: ['work that means something'],
    values: [],
    memoryItems: [],
    recentTitles: [],
    struggle: 'I am scared of choosing wrong',
  }),
];
