import { BANNED_PHRASES } from '@aura/shared';

/**
 * Aura's voice constitution (08 §3, product 14). This is the STABLE prefix of
 * every system prompt — identical across artifacts and across users — so it
 * sits first and the provider's prompt cache can reuse it (08 §7). Never
 * interpolate anything user-specific into this string.
 *
 * It states product 14's rules as positive craft AND the banned list as hard
 * negative constraints; the QA gate is the backstop, but a good system prompt
 * means the gate rarely has to fire.
 */
export const PROMPT_VERSION = '2026-07-17.1';

export const VOICE_CONSTITUTION = `You are Aura, a warm, emotionally intelligent companion who writes for one person you know well. You speak as "I". Your register is literary but plain-spoken — a wise friend who remembers everything and rushes nothing. You are never clinical, robotic, preachy, fake-positive, verbose, or salesy.

How you write:
- Use her exact words verbatim when they are given to you. Never paraphrase her dream into generic language.
- Agency framing always: "you did", "you kept going" — never "the universe delivered", never wishing or magic-as-external-force.
- Short sentences. Room to breathe. One idea per line in emotional moments.
- Second person, and her name where it lands naturally — never "the user".
- No exclamation marks in emotional writing.
- Present her struggle, when you reference it, gently and in her own words — then show it becoming a memory. Never dwell, never diagnose.

You must never use these phrases or anything like them:
${BANNED_PHRASES.map((p) => `- "${p}"`).join('\n')}

You return your answer as strict JSON. No prose outside the JSON.`;

/**
 * Renders the assembled memory context into the prompt's context block (08 §3).
 * Exact phrases are listed with an explicit instruction to reuse them literally —
 * that literal reuse is what makes a moment feel written for her (product 03).
 */
export function renderContextBlock(context: {
  name: string | null;
  dreamCity: string | null;
  dreamHome: string | null;
  selfDescription: string | null;
  values: string[];
  people: { name: string; descriptor: string | null }[];
  struggle: string | null;
  memoryItems: { content: string }[];
  exactPhrases: string[];
  neverInclude: string[];
  recentTitles: string[];
  directives: { kind: string; item: string }[];
}): string {
  const lines: string[] = [
    'Here is what you know about her. Use it — this is why it will feel real.',
  ];

  if (context.name) lines.push(`Her name: ${context.name}`);
  if (context.selfDescription) lines.push(`How she describes herself: ${context.selfDescription}`);
  if (context.dreamCity) lines.push(`Her dream city: ${context.dreamCity}`);
  if (context.dreamHome) lines.push(`Her dream home: ${context.dreamHome}`);
  if (context.values.length) lines.push(`What she values: ${context.values.join(', ')}`);

  if (context.people.length) {
    const people = context.people
      .map((p) => (p.descriptor ? `${p.name} (${p.descriptor})` : p.name))
      .join(', ');
    lines.push(`Her people, by name: ${people}`);
  }

  if (context.struggle) {
    lines.push(
      `What feels heaviest to her, in her words: "${context.struggle}". Reference it once, gently, then show it softening into something she has moved through.`,
    );
  }

  if (context.memoryItems.length) {
    lines.push('Things she has told you:');
    for (const item of context.memoryItems) lines.push(`- ${item.content}`);
  }

  if (context.exactPhrases.length) {
    lines.push(
      'Her own exact words — use at least a few of these LITERALLY, unchanged, inside what you write:',
    );
    for (const phrase of context.exactPhrases) lines.push(`- "${phrase}"`);
  }

  for (const directive of context.directives) {
    if (directive.kind === 'remembered_detail') {
      lines.push(`Weave in this remembered detail, naturally: ${directive.item}`);
    }
    if (directive.kind === 'explicit_callback') {
      lines.push(`Open by recalling this, in her own words: "${directive.item}"`);
    }
  }

  if (context.neverInclude.length) {
    // Hard exclusions restated in-prompt; the QA gate re-checks post-generation (09 §6).
    lines.push(
      `NEVER mention any of these, in any form: ${context.neverInclude.map((t) => `"${t}"`).join(', ')}`,
    );
  }

  if (context.recentTitles.length) {
    lines.push(
      `Recent moments you have already written (do NOT repeat their themes): ${context.recentTitles.join('; ')}`,
    );
  }

  return lines.join('\n');
}
