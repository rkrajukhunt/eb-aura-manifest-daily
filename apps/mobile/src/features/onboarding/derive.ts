import { onboardingCopy, type TimeKey } from '@/copy/onboarding';

import { framingOf, moodOf, obstacleKeyOf, primaryGoalOf, type FlowAnswers } from './flow';

/**
 * Copy derived from her answers — the reflect-back, the reminder preview, the
 * button that names her time. Pure readers over the draft, so the screens stay
 * declarative and the templates live in one place.
 */

function valueOf(answers: FlowAnswers, id: keyof FlowAnswers): unknown {
  const answer = answers[id];
  return answer && !answer.skipped ? answer.value : undefined;
}

export function nameOf(answers: FlowAnswers): string | null {
  const value = valueOf(answers, 's03-name');
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

export function timeChoiceOf(answers: FlowAnswers) {
  const raw = valueOf(answers, 'a08-ritual-time');
  const key = typeof raw === 'string' ? raw : (raw as { key?: TimeKey })?.key;
  const choices = onboardingCopy.a08RitualTime.choices;
  return choices.find((c) => c.key === key) ?? choices[0]!;
}

/** "8:15am" — the preset/fine-tuned time the reminder will actually use. */
export function ritualTimeOf(answers: FlowAnswers): string {
  const raw = valueOf(answers, 'a08-ritual-time');
  if (
    typeof raw === 'object' &&
    raw !== null &&
    'time' in raw &&
    typeof (raw as { time: string }).time === 'string'
  ) {
    return (raw as { time: string }).time;
  }
  if (typeof raw === 'string') {
    const choice = onboardingCopy.a08RitualTime.choices.find((c) => c.key === raw);
    if (choice) return choice.time;
    return raw;
  }
  return timeChoiceOf(answers).time;
}

/** The affirmation set her framing and goal select — process lines by default. */
export function framedLinesOf(answers: FlowAnswers): readonly string[] {
  const framing = framingOf(answers);
  const goal = primaryGoalOf(answers);
  if (framing === 'process') return onboardingCopy.a11Affirmation.bank[goal];
  return onboardingCopy.framedBank[framing][goal];
}

/** The line the reminder preview quotes — tomorrow's first one. */
export function firstAffirmationOf(answers: FlowAnswers): string {
  return framedLinesOf(answers)[0] ?? '';
}

/** The reflect-back sentences, filled from what she actually said. */
export function reflectionOf(answers: FlowAnswers) {
  const c = onboardingCopy.vReflect;
  const goal = primaryGoalOf(answers);
  const goalPhrase =
    onboardingCopy.a04Goals.choices.find((g) => g.key === goal)?.phrase ?? 'confidence';
  const mood = moodOf(answers);
  const moodSoft = mood ? c.moodSoft[mood] : c.moodSoft.okay;
  const obstacleKey = obstacleKeyOf(answers);
  const obstaclePhrase =
    onboardingCopy.a06Obstacle.choices.find((o) => o.key === obstacleKey)?.phrase ??
    'losing motivation';
  const framing = c.framingWord[framingOf(answers)];
  const dayPart = timeChoiceOf(answers).dayPart;

  const offLimits = valueOf(answers, 'q-offlimits') as { topics?: string[] } | undefined;
  const topic = offLimits?.topics?.[0];
  const blocked = topic ? c.blockedClause.replace('{topic}', topic.toLowerCase()) : '';

  const name = nameOf(answers);
  return {
    eyebrow: c.eyebrow.replace('{name}', name ? `, ${name}` : ''),
    goalPhrase,
    moodSoft,
    obstaclePhrase,
    dayPart,
    framing,
    blocked,
  };
}
