import type { Database } from '../types/database';
import { harvestPhrases } from './harvester';
import { emotionalWeight } from './weight';

type MemoryCategory = Database['public']['Enums']['memory_category'];
type MemoryTier = Database['public']['Enums']['memory_tier'];

/**
 * Onboarding seed (09 §1): profile answers → memory_items + exact_phrases.
 *
 * A pure function so it can be tested exhaustively and run from either app
 * (01 §4). It returns rows; the caller writes them. Keeping the DB out of here
 * is what makes "onboarding fixture → expected items" a real test.
 *
 * This runs once, on onboarding completion, and its output is what makes her
 * Letter feel written for her rather than about her. If this is wrong, the wow
 * is wrong — nothing downstream can recover it.
 */

export interface SeedProfile {
  name?: string | null;
  self_description?: string | null;
  dream_home?: string | null;
  dream_city?: string | null;
  struggle?: string | null;
  free_text_note?: string | null;
  values?: string[] | null;
}

export interface SeededMemoryItem {
  category: MemoryCategory;
  tier: MemoryTier;
  content: string;
  verbatim: string | null;
  source: 'onboarding';
  emotional_weight: number;
}

export interface SeededPhrase {
  phrase: string;
  source: 'onboarding';
}

export interface MemorySeed {
  items: SeededMemoryItem[];
  phrases: SeededPhrase[];
}

/**
 * Free-text screens (09 §1). Chip and card screens are choices, not her words —
 * harvesting them would echo our vocabulary back at her and call it memory.
 */
const FREE_TEXT_FIELDS = ['self_description', 'dream_city', 'struggle', 'free_text_note'] as const;

export function seedMemoryFromOnboarding(profile: SeedProfile): MemorySeed {
  const items: SeededMemoryItem[] = [];

  if (isPresent(profile.name)) {
    items.push({
      category: 'identity',
      tier: 'permanent',
      // Plain language: this string is shown verbatim on "What Aura Knows" (09 §6).
      content: `Your name is ${profile.name.trim()}`,
      verbatim: profile.name.trim(),
      source: 'onboarding',
      // A name is a choice-free fact, not an emotional disclosure.
      emotional_weight: emotionalWeight({ text: profile.name, userAuthored: true }),
    });
  }

  if (isPresent(profile.self_description)) {
    items.push({
      category: 'identity',
      tier: 'permanent',
      content: `You described yourself as: ${profile.self_description.trim()}`,
      verbatim: profile.self_description.trim(),
      source: 'onboarding',
      emotional_weight: emotionalWeight({ text: profile.self_description, userAuthored: true }),
    });
  }

  if (isPresent(profile.dream_city)) {
    items.push({
      category: 'dream',
      tier: 'permanent',
      content: `Your dream city is ${profile.dream_city.trim()}`,
      verbatim: profile.dream_city.trim(),
      source: 'onboarding',
      emotional_weight: emotionalWeight({ text: profile.dream_city, userAuthored: true }),
    });
  }

  if (isPresent(profile.dream_home)) {
    items.push({
      category: 'dream',
      tier: 'permanent',
      content: `Your dream home is ${describeDreamHome(profile.dream_home)}`,
      // A card id is our word, not hers — so there is no verbatim to keep.
      verbatim: null,
      source: 'onboarding',
      emotional_weight: emotionalWeight({ text: profile.dream_home, userAuthored: false }),
    });
  }

  for (const value of profile.values ?? []) {
    if (!isPresent(value)) continue;
    items.push({
      category: 'identity',
      tier: 'permanent',
      content: `You value ${value.trim()}`,
      verbatim: null,
      source: 'onboarding',
      emotional_weight: emotionalWeight({ text: value, userAuthored: false }),
    });
  }

  if (isPresent(profile.struggle)) {
    items.push({
      category: 'struggle',
      // SENSITIVE, always (09 §2): never a title, never a notification, never a
      // share card, never analytics. The tier is the enforcement point.
      tier: 'sensitive',
      content: `You told me you're struggling with: ${profile.struggle.trim()}`,
      verbatim: profile.struggle.trim(),
      source: 'onboarding',
      emotional_weight: emotionalWeight({
        text: profile.struggle,
        userAuthored: true,
        isStruggle: true,
      }),
    });
  }

  if (isPresent(profile.free_text_note)) {
    items.push({
      category: 'place_lifestyle',
      tier: 'evolving',
      content: `You wanted me to know: ${profile.free_text_note.trim()}`,
      verbatim: profile.free_text_note.trim(),
      source: 'onboarding',
      emotional_weight: emotionalWeight({ text: profile.free_text_note, userAuthored: true }),
    });
  }

  return { items, phrases: seedPhrases(profile) };
}

/**
 * Harvests phrases from her free text only (09 §1: S4/S8/S10 + the note).
 * Deduped across fields so a word repeated in two answers is stored once.
 */
function seedPhrases(profile: SeedProfile): SeededPhrase[] {
  const seen = new Set<string>();
  const phrases: SeededPhrase[] = [];

  for (const field of FREE_TEXT_FIELDS) {
    const text = profile[field];
    if (!isPresent(text)) continue;

    for (const phrase of harvestPhrases(text)) {
      const key = phrase.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      phrases.push({ phrase, source: 'onboarding' });
    }
  }

  return phrases;
}

/** S7 stores a card id; this renders it in plain language for the memory screen. */
function describeDreamHome(cardId: string): string {
  return cardId.replace(/[-_]/g, ' ').trim();
}

function isPresent(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim() !== '';
}
