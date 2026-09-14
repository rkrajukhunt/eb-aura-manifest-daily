import type { Ionicons } from '@expo/vector-icons';

export type OptionIcon = keyof typeof Ionicons.glyphMap;

/** Shared v5 option icons — one tile icon per answer, keyed by what is recorded. */

export const GOAL_ICON_BY_LABEL: Record<string, OptionIcon> = {
  Confidence: 'arrow-up-outline',
  'Love & relationships': 'heart-outline',
  'Money & abundance': 'cash-outline',
  'Career & purpose': 'briefcase-outline',
  'Calm & less anxiety': 'leaf-outline',
  'Better habits': 'checkmark-outline',
};

export const MOOD_ICON: Record<string, OptionIcon> = {
  good: 'sunny-outline',
  okay: 'partly-sunny-outline',
  updown: 'cloud-outline',
  low: 'sad-outline',
  struggling: 'heart-dislike-outline',
};

export const LEXICON_ICON: Record<string, OptionIcon> = {
  universe: 'planet-outline',
  neuro: 'flask-outline',
  faith: 'infinite-outline',
  practical: 'compass-outline',
  mix: 'contrast-outline',
};

export const CALIBRATION_ICON: Record<string, OptionIcon> = {
  true: 'thumbs-up-outline',
  want: 'star-outline',
  fake: 'eye-outline',
};

export const RITUAL_TIME_ICON: Record<string, OptionIcon> = {
  morning: 'sunny-outline',
  lunch: 'partly-sunny-outline',
  evening: 'moon-outline',
  'before-bed': 'bed-outline',
};

export const BELIEF_ICON: Record<string, OptionIcon> = {
  identity: 'trophy-outline',
  process: 'leaf-outline',
  practical: 'compass-outline',
};

export const PRONOUN_ICON: OptionIcon = 'person-outline';

/** Q3 context — exact choice labels per primary goal. */
export const CONTEXT_ICON_BY_LABEL: Record<string, OptionIcon> = {
  // career
  'Love it': 'rocket-outline',
  'Fine for now': 'pause-outline',
  'Ready for something new': 'compass-outline',
  'Building something on the side': 'bulb-outline',
  // money
  'Tight and anxious': 'alert-circle-outline',
  'Stuck at the same level': 'pause-outline',
  'Fine, I want more': 'trending-up-outline',
  'I avoid thinking about it': 'eye-outline',
  // love
  'Single, want to meet someone': 'person-outline',
  'Building something new': 'heart-outline',
  'In it, want it stronger': 'people-outline',
  'Healing from something': 'leaf-outline',
  // confidence
  'Speaking up': 'mic-outline',
  'How I look': 'image-outline',
  'My work': 'briefcase-outline',
  'Around certain people': 'people-outline',
  // calm
  'First thing in the morning': 'cafe-outline',
  'At work': 'briefcase-outline',
  'Late at night': 'moon-outline',
  'It’s fairly constant': 'cloud-outline',
};

export const OFF_LIMITS_WORD_ICON: Record<string, OptionIcon> = {
  Manifest: 'sparkles-outline',
  'The universe': 'planet-outline',
  God: 'infinite-outline',
  Vibration: 'musical-notes-outline',
  Energy: 'bulb-outline',
  Abundance: 'gift-outline',
};

export const OFF_LIMITS_TOPIC_ICON: Record<string, OptionIcon> = {
  Money: 'cash-outline',
  Work: 'briefcase-outline',
  'My body': 'body-outline',
  Relationships: 'people-outline',
  Family: 'home-outline',
  Health: 'fitness-outline',
};

export const CUSTOM_WORD_ICON: OptionIcon = 'ban-outline';
export const ADD_YOUR_OWN_ICON: OptionIcon = 'add-outline';
