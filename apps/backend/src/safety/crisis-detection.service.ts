import { Inject, Injectable, Logger } from '@nestjs/common';

import { LLM_PROVIDER, type LlmProvider } from '../providers/llm/llm-provider.interface';
import { CRISIS_KEYWORDS, CRISIS_KEYWORD_VERSION } from './crisis-keywords';

/**
 * Both layers must finish in < 2s combined (14 §5.2). The classifier is the only
 * network hop, so its timeout is the effective budget.
 */
const CLASSIFIER_TIMEOUT_MS = 2_000;

/** Yes/no rubric — a few tokens is plenty; anything larger just costs latency. */
const CLASSIFIER_MAX_TOKENS = 5;

/**
 * Tight classifier instruction (14 §5.2). Its whole job is to separate a real
 * disclosure of crisis from the idioms that trip the keyword screen ("my job is
 * killing me", "I'd die for a coffee", "this commute is murder"). Kept literal
 * and closed-form so the response is trivial to parse.
 */
const CLASSIFIER_SYSTEM_PROMPT = [
  'You are a safety classifier for a self-reflection app.',
  'Decide whether the user text expresses a GENUINE crisis: active thoughts of',
  'suicide or self-harm, or being physically/sexually abused or in danger from',
  'another person, or acute suicidal despair.',
  'Figurative or idiomatic language is NOT a crisis. Examples that are NOT a',
  'crisis: "my job is killing me", "I\'d die for a coffee", "this commute is',
  'murder", "I\'m dying to see it", "killer workout".',
  'Answer with exactly one word: "yes" if it is a genuine crisis, otherwise "no".',
].join(' ');

/**
 * Layered crisis screen (14 §5, 08 §8): deterministic keyword gate → LLM confirm.
 *
 * PRIVACY — the input `text` is the user's most vulnerable disclosure. It is
 * NEVER logged, NEVER placed in an error message, NEVER emitted anywhere from
 * this service. It is passed to the injected provider for classification and
 * otherwise held only in local scope. Log lines here carry state, never content.
 */
@Injectable()
export class CrisisDetectionService {
  private readonly logger = new Logger(CrisisDetectionService.name);

  constructor(@Inject(LLM_PROVIDER) private readonly llm: LlmProvider) {}

  async screen(text: string): Promise<{ isCrisis: boolean }> {
    // Layer 1 — deterministic keyword screen. The vast majority of inputs hit
    // nothing and return here with zero LLM cost (14 §5.1).
    if (!this.hasKeywordHit(text)) {
      return { isCrisis: false };
    }

    // A keyword matched — log the fact, never the content, then confirm with the
    // classifier so idioms don't trigger the duty-of-care flow (14 §5.2).
    this.logger.log(
      `Keyword screen hit (list ${CRISIS_KEYWORD_VERSION}); running classifier confirm`,
    );

    return { isCrisis: await this.classifierConfirms(text) };
  }

  /**
   * Case-insensitive substring match, whitespace-normalized so multi-word
   * phrases match across normal spacing, tabs, and newlines in real input.
   */
  private hasKeywordHit(text: string): boolean {
    const haystack = normalize(text);
    return CRISIS_KEYWORDS.some((keyword) => haystack.includes(keyword));
  }

  private async classifierConfirms(text: string): Promise<boolean> {
    try {
      const response = await this.llm.generate({
        system: CLASSIFIER_SYSTEM_PROMPT,
        prompt: text,
        maxTokens: CLASSIFIER_MAX_TOKENS,
        timeoutMs: CLASSIFIER_TIMEOUT_MS,
      });
      return isAffirmative(response.text);
    } catch (error) {
      // FAIL SAFE toward isCrisis:true. A provider error or timeout must never
      // let a genuine crisis slip through the gate — the product-18 duty of care
      // means we err toward showing support. `error` is logged by shape only;
      // it could echo the input, so we never include its message or the text.
      this.logger.error(
        `Classifier confirm failed (${error instanceof Error ? error.name : 'unknown'}); failing safe to crisis`,
      );
      return true;
    }
  }
}

/** Lower-case and collapse all whitespace so phrase matching is spacing-agnostic. */
function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ');
}

/** Affirmative = response begins with yes/true/1 after trimming (14 §5.2 rubric). */
function isAffirmative(text: string): boolean {
  return /^\s*(yes|true|1)/i.test(text);
}
