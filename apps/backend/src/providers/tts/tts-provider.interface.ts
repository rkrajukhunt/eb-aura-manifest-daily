/**
 * TTS abstraction (10 §1, 00 §D5).
 *
 * Word timings drive the Letter's karaoke sync (10 §5) — they are product, not
 * telemetry. ElevenLabs returns character timings; the adapter aggregates them
 * into words so this interface stays vendor-neutral.
 */
export interface TtsWordTiming {
  word: string;
  startMs: number;
  endMs: number;
}

export interface TtsSynthesizeRequest {
  text: string;
  voiceId: string;
}

export interface TtsSynthesizeResponse {
  /** mp3, 44.1kHz 128kbps (10 §2). */
  audio: Buffer;
  wordTimings: TtsWordTiming[];
  durationMs: number;
}

export interface TtsProvider {
  synthesize(req: TtsSynthesizeRequest): Promise<TtsSynthesizeResponse>;
  /** Reachability probe for /v1/health (04 §7). Must never throw. */
  ping(): Promise<boolean>;
}

/** Nest DI token — `TtsProvider` is an interface and vanishes at runtime. */
export const TTS_PROVIDER = Symbol('TtsProvider');
