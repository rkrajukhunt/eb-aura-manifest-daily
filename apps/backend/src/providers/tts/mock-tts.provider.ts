import { Injectable } from '@nestjs/common';

import type {
  TtsProvider,
  TtsSynthesizeRequest,
  TtsSynthesizeResponse,
  TtsWordTiming,
} from './tts-provider.interface';

/** Words-per-minute the synthetic timings pretend to speak at — Aura's voice is unhurried (10 §2). */
const MOCK_WPM = 140;
const MS_PER_WORD = (60 * 1000) / MOCK_WPM;

/**
 * Dev/CI adapter (10 §1): silent audio + synthetic timings.
 *
 * The timings matter more than the audio — Phase 6's karaoke word-index math is
 * unit-tested against fixtures shaped exactly like this.
 */
@Injectable()
export class MockTtsProvider implements TtsProvider {
  async synthesize(req: TtsSynthesizeRequest): Promise<TtsSynthesizeResponse> {
    const words = req.text.trim() === '' ? [] : req.text.trim().split(/\s+/);

    const wordTimings: TtsWordTiming[] = words.map((word, index) => ({
      word,
      startMs: Math.round(index * MS_PER_WORD),
      endMs: Math.round((index + 1) * MS_PER_WORD),
    }));

    return {
      audio: Buffer.alloc(0),
      wordTimings,
      durationMs: Math.round(words.length * MS_PER_WORD),
    };
  }

  async ping(): Promise<boolean> {
    return true;
  }
}
