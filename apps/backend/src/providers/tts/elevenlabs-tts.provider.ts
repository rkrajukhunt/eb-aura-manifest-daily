import { Logger } from '@nestjs/common';

import type {
  TtsProvider,
  TtsSynthesizeRequest,
  TtsSynthesizeResponse,
  TtsWordTiming,
} from './tts-provider.interface';

interface ElevenLabsConfig {
  apiKey: string;
  model: string;
}

/**
 * ElevenLabs adapter (10 §2). Uses the with-timestamps endpoint so audio and
 * character-level timings arrive in one call — the timings drive the Letter's
 * karaoke sync (10 §5), which is product, not telemetry.
 *
 * The core job here is the character → word aggregation (10 §2): ElevenLabs
 * returns per-character timings; the renderer needs per-word. Getting the word
 * boundaries wrong desyncs the karaoke, so this is the load-bearing logic.
 */
export class ElevenLabsTtsProvider implements TtsProvider {
  private readonly logger = new Logger(ElevenLabsTtsProvider.name);
  private readonly baseUrl = 'https://api.elevenlabs.io/v1';

  constructor(private readonly config: ElevenLabsConfig) {}

  async synthesize(req: TtsSynthesizeRequest): Promise<TtsSynthesizeResponse> {
    const res = await fetch(`${this.baseUrl}/text-to-speech/${req.voiceId}/with-timestamps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': this.config.apiKey,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        text: req.text,
        model_id: this.config.model,
        // mp3 44.1kHz 128kbps — voice-optimized (10 §2).
        output_format: 'mp3_44100_128',
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`ElevenLabs ${res.status}: ${detail.slice(0, 200)}`);
    }

    const json = (await res.json()) as ElevenLabsResponse;
    const audio = Buffer.from(json.audio_base64, 'base64');
    const wordTimings = charTimingsToWords(json.alignment);
    const durationMs =
      wordTimings.length > 0 ? (wordTimings[wordTimings.length - 1]?.endMs ?? 0) : 0;

    return { audio, wordTimings, durationMs };
  }

  async ping(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      try {
        const res = await fetch(`${this.baseUrl}/models`, {
          headers: { 'xi-api-key': this.config.apiKey },
          signal: controller.signal,
        });
        return res.ok;
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      this.logger.warn(
        `ElevenLabs ping failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return false;
    }
  }
}

interface ElevenLabsResponse {
  audio_base64: string;
  alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  } | null;
}

/**
 * Aggregates ElevenLabs' per-character timings into per-word timings (10 §2):
 * walk the characters, accumulating a word's span until whitespace closes it.
 * A word's start is its first character's start; its end is its last character's end.
 */
export function charTimingsToWords(alignment: ElevenLabsResponse['alignment']): TtsWordTiming[] {
  if (!alignment) return [];

  const {
    characters,
    character_start_times_seconds: starts,
    character_end_times_seconds: ends,
  } = alignment;

  const words: TtsWordTiming[] = [];
  let current = '';
  let wordStartMs = 0;
  let lastEndMs = 0;

  const flush = () => {
    if (current !== '') {
      words.push({ word: current, startMs: wordStartMs, endMs: lastEndMs });
      current = '';
    }
  };

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i] ?? '';

    if (/\s/.test(char)) {
      // Whitespace closes the current word; the space itself carries no word.
      flush();
      continue;
    }

    if (current === '') {
      wordStartMs = Math.round((starts[i] ?? 0) * 1000);
    }
    current += char;
    lastEndMs = Math.round((ends[i] ?? 0) * 1000);
  }

  flush();
  return words;
}
