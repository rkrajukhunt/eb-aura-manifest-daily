# 10 — AUDIO & TTS

_The voice IS the product — the Letter is heard, not read. Implements product docs 08 (letter audio), 09 (player), 12 (player design), 13 (performance budgets). Vendor: **ElevenLabs** behind `TtsProvider`._

---

## 1. Provider abstraction

```ts
// providers/tts/tts-provider.interface.ts
interface TtsProvider {
  synthesize(req: { text: string; voiceId: string }): Promise<{
    audio: Buffer; // mp3
    wordTimings: { word: string; startMs: number; endMs: number }[];
    durationMs: number;
  }>;
  ping(): Promise<boolean>;
}
```

Adapters: `ElevenLabsTtsProvider`, `MockTtsProvider` (dev/CI — silent audio + synthetic timings).

## 2. ElevenLabs integration

- **Endpoint:** `/v1/text-to-speech/{voice_id}/with-timestamps` — returns audio + character-level timestamps in one call.
- **Timestamp pipeline:** character timings → word timings (split on whitespace, aggregate char spans) → stored as `moments.word_timings` jsonb. This drives karaoke sync (§5).
- **Voice:** one signature voice at V1 (product decision, doc 04/20-Q2 — final voice selection is a founder listening decision; `ELEVENLABS_VOICE_ID` env + `profiles.voice_id` column already support a second voice at V1.1 with zero migration).
- **Model/settings:** highest-quality multilingual model; stability tuned for warm unhurried delivery; settings frozen in config (a settings change re-auditions the whole product voice — treat like a brand change).
- **Contract requirement (product 18):** no-retention terms — ElevenLabs enterprise/zero-retention mode verified before production keys issued (tracked in 14 §8 checklist).
- **Format:** mp3 44.1kHz 128kbps (voice-optimized; ~1MB/min).

## 3. Storage & delivery

- Backend uploads to Supabase Storage `audio/{user_id}/{moment_id}.mp3` (private bucket, 02 §6).
- Mobile requests a **signed URL** (1h expiry) via the Supabase client at play/prefetch time; URLs are never persisted (re-signed on demand).
- Delivery is ranged HTTP from Supabase CDN — adequate at V1 scale; no separate CDN.

## 4. Mobile playback stack (05 §7)

`PlayerService` (singleton over `expo-audio`):

- **Modes:** background audio ON, lock-screen/remote controls (play/pause/seek), respects interruptions (pause on call; resume if transient).
- **Silent-switch:** audio plays through the media channel (ignores silent switch — standard for media apps); the Letter additionally pre-checks volume==0 and shows "Turn your sound on — this is meant to be heard" (product 08 §4).
- **Pre-buffering:** today's moment audio prefetched on app open and on notification receipt (background fetch of signed URL + file download to cache) → play start <300ms (product 13 budget).
- **Transport:** play/pause, scrubber with times, ±15s, speed 1.0/1.25/1.5 (`setRateAsync` with pitch correction).
- **Mini-player:** PlayerService state is global (Zustand); mini-player bar renders in tab layout while minimized (06 §2).

## 5. Karaoke text sync (Letter + Read mode)

- Player emits position at ~30–60Hz (Reanimated shared value updated from playback status callback + interpolation between callbacks for smoothness).
- Current word index = binary search over `word_timings`; line grouping precomputed (2–6 words/line for the Letter per product 08 §5; sentence-level highlight for Read mode per product 09 §9.1).
- Letter renderer: line materialize (fade + 8px rise 300ms) as its first word starts; previous lines dim to 60%; auto-scroll driven by same shared value. All UI-thread (Reanimated) — no JS-thread jank.
- Drift guard: timings re-anchored on every status callback (absolute position, not accumulated deltas).

## 6. Caching & offline (product 05 — "audio cached; favorites replayable offline")

| Content                                                                                                         | Cache policy                                                                          |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| The Letter                                                                                                      | cached permanently on device at first play (it's "kept forever" — free tier included) |
| Today's moment                                                                                                  | prefetched; evicted after 7 days                                                      |
| Favorites                                                                                                       | cached permanently while favorited; evicted on unfavorite                             |
| Everything else                                                                                                 | streamed; LRU cache cap 200MB                                                         |
| Cache index in MMKV (`{momentId → localPath, cachedAt}`); files in app cache dir; deletion wipes cache (03 §5). |

## 7. Cost (the margin driver — 08 §7)

ElevenLabs ≈ $0.10–0.15/1k chars at scale tiers. Daily moment ≈ 900 chars → ~$3–4/user/month worst case. Mitigations (all shipped at V1):

1. Pre-generation skip for inactive users (>7 days) — the biggest saver; most cost scales with _active_ users only.
2. One-a-day pacing + refine/on-demand caps (08 §7).
3. Affirmations are **text-only** at V1 (no TTS) — product docs treat them as cards.
4. Volume pricing negotiation once >1k MAU (flagged for founder).
5. Fallback lever (documented, not built): cheaper TTS tier for free-tier users if economics demand — product would prefer cutting elsewhere first (free tier IS marketing, product 20-Q10).

## 8. Phase mapping

Phase 5: provider, synthesis, storage, timings. Phase 6: Letter playback + karaoke renderer + silent-switch pre-check + permanent letter cache. Phase 7: full player, mini-player, read mode, prefetch, offline cache policy.
