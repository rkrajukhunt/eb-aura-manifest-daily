# 13 — MOTION & HAPTICS

Rule zero: every animation has a UX purpose stated here, runs at 60fps on mid-tier devices, and respects Reduce Motion (crossfade fallbacks). No random animations.

## Motion principles

1. **Breath, not bounce.** Ease-in-out curves, 300–500ms; springs only for sheets and card presses. Nothing elastic/cartoonish.
2. **Motion = meaning.** Transitions communicate hierarchy (push = deeper, sheet = temporary, cover = a moment).
3. **The orb is the only performer.** One living element; everything else moves quietly.
4. **Slow down for emotion.** The Letter world runs ~20% slower than the utility world; onboarding sits between.

## Catalog (animation → purpose)

| Where               | Animation                                                                   | UX purpose                                                    |
| ------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Navigation push/pop | Standard iOS slide + interactive back-swipe                                 | Native spatial model; users already know it                   |
| Onboarding advance  | 350ms horizontal push + crossfade of question text                          | Conversation rhythm — a new thought arriving, not a form page |
| Reflection beats    | Chat-bubble fade+rise, 600ms typing dots first                              | Proves "someone is listening" before replying                 |
| Chip/card select    | Scale 0.97 + fill tint, 150ms                                               | Immediate acknowledgment at low motion cost                   |
| Generating (Letter) | Orb breath slows→deepens; gradient dusk shift; lines fade in sequenced      | Converts latency into ritual/anticipation                     |
| Letter text         | Line materialize (fade + 8px rise, 300ms) synced to speech; prior lines dim | Focus on the spoken word; karaoke without kitsch              |
| Letter→paywall      | Same-world crossfade (no push)                                              | Paywall reads as next page of the letter, not an interruption |
| Player orb          | Amplitude-reactive glow while speaking                                      | The companion is _present_; audio feels alive                 |
| Mini-player appear  | Slide-up 250ms above tab bar                                                | Audio continuity without stealing the screen                  |
| Sheet presentation  | Native spring detents + 40% dim                                             | Temporary-task mental model                                   |
| Affirmation reveal  | Card flip-fade 400ms                                                        | Small daily ceremony; makes "one a day" feel like a gift      |
| Save/heart          | Heart fill + tiny scale pulse                                               | Confirmation joy, contained                                   |
| Gratitude dot fill  | Dot fills with 200ms ease                                                   | Quiet completion; no fireworks                                |
| Countdown chips     | Static numerals, minute-level tick                                          | Anticipation without anxiety (no urgent flashing)             |
| List loading        | Soft shimmer skeleton on Sand                                               | Perceived speed without spinners                              |
| Error recovery      | Content crossfades to retry copy                                            | Failures stay calm; no shake/red flash                        |

## Haptics (punctuation, not decoration)

| Event                                                                                            | Haptic                                          |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| Primary button press                                                                             | Light impact                                    |
| Continue in onboarding                                                                           | Light impact                                    |
| Reflection beat lands                                                                            | Soft success tick (subtle)                      |
| Letter audio begins                                                                              | Single light impact — marks "this is beginning" |
| Letter closing line                                                                              | Soft tick                                       |
| Affirmation reveal                                                                               | Light impact                                    |
| Save/favorite                                                                                    | Success notification haptic                     |
| Gratitude saved                                                                                  | Soft tick                                       |
| Milestone letter arrival (in-app)                                                                | Medium impact, once                             |
| Errors                                                                                           | None (no error haptics — calm recovery)         |
| Paywall                                                                                          | None (no haptic pressure on purchase surfaces)  |
| Global: haptics respect system settings; never repeat within 500ms; total per screen ≤2 typical. |

## Performance budget

Transitions ≤500ms; JS-thread-free animations (native driver / Reanimated-class); orb implemented as shader/lottie-light with CPU cap; audio start latency target <300ms from tap (pre-buffered daily moment); skeleton-to-content <1.5s p75.
