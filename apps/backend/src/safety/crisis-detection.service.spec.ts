import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { LLM_PROVIDER, type LlmProvider } from '../providers/llm/llm-provider.interface';
import { CrisisDetectionService } from './crisis-detection.service';
import { CRISIS_KEYWORDS } from './crisis-keywords';

/**
 * Crisis screen suite (14 §5, 15 §2).
 *
 * The two properties that matter are asymmetric on purpose: the screen may cost
 * a false alarm, but it must never miss — so every failure path is asserted to
 * land on `isCrisis: true`. The second property is privacy: her most vulnerable
 * disclosure must not appear in a log line, ever.
 */
describe('CrisisDetectionService', () => {
  let service: CrisisDetectionService;
  let generate: jest.Mock;

  const buildService = async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CrisisDetectionService,
        { provide: LLM_PROVIDER, useValue: { generate } as unknown as LlmProvider },
      ],
    }).compile();

    return moduleRef.get(CrisisDetectionService);
  };

  beforeEach(async () => {
    generate = jest
      .fn()
      .mockResolvedValue({ text: 'no', usage: { inputTokens: 0, outputTokens: 0 } });
    service = await buildService();
  });

  afterEach(() => jest.restoreAllMocks());

  describe('layer 1 — the deterministic keyword screen', () => {
    it('passes benign text with no LLM cost at all', async () => {
      await expect(service.screen('Work has been busy but good.')).resolves.toEqual({
        isCrisis: false,
      });

      expect(generate).not.toHaveBeenCalled();
    });

    it.each(CRISIS_KEYWORDS.slice(0, 12))(
      'escalates the keyword %p to the classifier',
      async (keyword) => {
        await service.screen(`Lately I ${keyword} and I do not know what to do.`);

        expect(generate).toHaveBeenCalledTimes(1);
      },
    );

    it('matches regardless of case', async () => {
      await service.screen('I WANT TO DIE.');

      expect(generate).toHaveBeenCalledTimes(1);
    });

    it('matches a multi-word phrase across newlines and tabs', async () => {
      await service.screen('I want\n\tto   die');

      expect(generate).toHaveBeenCalledTimes(1);
    });

    it('does not escalate when no term is present, however dark the tone', async () => {
      await service.screen('I am exhausted and sad and everything feels heavy.');

      expect(generate).not.toHaveBeenCalled();
    });
  });

  describe('layer 2 — the classifier confirm', () => {
    it('reports a crisis when the classifier says yes', async () => {
      generate.mockResolvedValue({ text: 'yes', usage: { inputTokens: 0, outputTokens: 0 } });

      await expect(service.screen('I want to die')).resolves.toEqual({ isCrisis: true });
    });

    it('clears an idiom when the classifier says no', async () => {
      generate.mockResolvedValue({ text: 'no', usage: { inputTokens: 0, outputTokens: 0 } });

      await expect(service.screen('my job is killing me')).resolves.toEqual({ isCrisis: false });
    });

    it.each(['yes', 'Yes', 'YES', ' yes', 'yes.', 'true', '1'])(
      'reads %p as affirmative',
      async (text) => {
        generate.mockResolvedValue({ text, usage: { inputTokens: 0, outputTokens: 0 } });

        await expect(service.screen('I want to die')).resolves.toEqual({ isCrisis: true });
      },
    );

    it.each(['no', 'No.', 'NO', '', 'not a crisis'])('reads %p as negative', async (text) => {
      generate.mockResolvedValue({ text, usage: { inputTokens: 0, outputTokens: 0 } });

      await expect(service.screen('I want to die')).resolves.toEqual({ isCrisis: false });
    });

    it('spends a tiny token budget inside the 2s duty-of-care window (14 §5.2)', async () => {
      await service.screen('I want to die');

      expect(generate).toHaveBeenCalledWith(
        expect.objectContaining({ maxTokens: 5, timeoutMs: 2_000 }),
      );
    });

    it('sends the rubric as system and her text as the prompt', async () => {
      await service.screen('I want to die');

      const req = generate.mock.calls[0][0];
      expect(req.system).toContain('safety classifier');
      expect(req.prompt).toBe('I want to die');
    });
  });

  describe('failing safe (product 18 duty of care)', () => {
    it('reports a crisis when the classifier throws', async () => {
      generate.mockRejectedValue(new Error('connection reset'));

      await expect(service.screen('I want to die')).resolves.toEqual({ isCrisis: true });
    });

    it('reports a crisis when the classifier times out', async () => {
      const timeout = new Error('The operation was aborted');
      timeout.name = 'AbortError';
      generate.mockRejectedValue(timeout);

      await expect(service.screen('I want to die')).resolves.toEqual({ isCrisis: true });
    });

    it('reports a crisis when the provider rejects with a non-Error', async () => {
      generate.mockRejectedValue('nope');

      await expect(service.screen('I want to die')).resolves.toEqual({ isCrisis: true });
    });
  });

  describe('privacy — her disclosure never reaches a log line', () => {
    const disclosure = 'I want to die and my partner hits me when he drinks';

    it('logs the keyword hit by state only, never by content', async () => {
      const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();

      await service.screen(disclosure);

      expect(log).toHaveBeenCalled();
      for (const call of log.mock.calls) {
        expect(JSON.stringify(call)).not.toContain('partner');
        expect(JSON.stringify(call)).not.toContain('die');
      }
    });

    it('logs a classifier failure by error shape only', async () => {
      const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      // A provider error that echoes the input back — the exact leak risk.
      generate.mockRejectedValue(new Error(`upstream rejected: ${disclosure}`));

      await service.screen(disclosure);

      expect(error).toHaveBeenCalled();
      for (const call of error.mock.calls) {
        expect(JSON.stringify(call)).not.toContain('partner');
        expect(JSON.stringify(call)).not.toContain('drinks');
      }
    });
  });
});
