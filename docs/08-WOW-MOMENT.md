# 08 — WOW MOMENT: "A Letter From Your Future Self"

The single most important experience in the app. Everything in onboarding sets it up; everything after repeats it in smaller doses. Target thought: _"Wow. This was made specifically for me."_

## Content spec

60–90 seconds of audio; first-person letter FROM the user's future self TO them today.
Must include (verbatim tokens): their **name** (opening line) · **dream city** · **≥1 person by name** with their descriptor woven naturally · the **struggle in their own words**, then the morning five years from now when it's a memory · **≥1 exact phrase** from self-description · dynamic date close: "You started this on a {weekday} in {month}. I remember. Keep going."
Must NOT include: passive wishing ("the universe delivered") — the letter narrates agency ("you kept going, you did the unglamorous parts"); anything from a Never-Include seed; clinical or hype language.

## Experience choreography

1. **Emotional setup (from S10):** the last question was the struggle; the reflection held it gently. The user is open.
2. **Anticipation / generation (15–40s real latency, designed as ritual):** screen quiets to full-bleed gradient; orb slows its breath; three lines fade in sequence: "Thank you, {name}." → "I'm writing you something." → "It's from someone who knows you very well." No spinner, no progress bar, no percentages. If generation exceeds ~45s: fourth line "Almost. Some letters take a moment." Failure → graceful retry copy ("Let me start again — this one matters"), never an error code.
3. **Transition into the moment:** gradient deepens (light → dusk), orb ascends slightly, one breath of silence (~1.5s), then a **single soft haptic** (light impact) as the first word of audio begins. The haptic marks "this is beginning."
4. **Audio experience:** warm TTS voice, unhurried pace, subtle room-tone bed (very low, optional). Plays through the media channel; respects silent switch with a gentle pre-check ("Turn your sound on — this is meant to be heard" if volume 0/muted).
5. **Text behavior:** karaoke-style — the current line materializes as it is spoken (fade+rise 300ms), previous lines dim to 60%, upcoming lines invisible. Large serif display type (see 12), 2–6 words per line, generous leading. The screen scrolls itself; the user touches nothing.
6. **Controls:** NONE visible. No skip, no scrubber, no pause button, no close X. (Escape hatch: system back-swipe pauses and shows a minimal "Continue listening / Save for later" sheet — never trap, but never invite exit.)
7. **Pacing:** the whole sequence from S11 to letter-end ≈ 2–2.5 min. Silence is allowed; the letter may breathe.
8. **Haptics:** one at audio start; one soft tick at the dynamic-date closing line; nothing else. Haptics are punctuation, not decoration.

## When the audio ends

- Last line hangs on screen 2s. Then, below it, quietly: **"Your future self has more to tell you."** and a single button: **Continue**.
- The letter is automatically saved to Favorites (told later, on Home: "Your letter is kept. It's yours forever." — free tier keeps it; this is a trust gift, not a hostage).
- Continue → paywall (15). The paywall inherits the visual world (same gradient family) so it feels like the next page of the letter, not an interruption. PRODUCT DECISION: no notification-permission dialog, no rating prompt, nothing between letter and paywall.

## Why pre-paywall (PRODUCT DECISION vs Stella)

Stella gates the first story behind payment; its 1-star reviews show quiz-effort→surprise-price rage. Aya proves before-paywall works. The Letter is our best salesperson; spending it before the ask converts _and_ protects reviews. Cost of free letters ≈ pennies of LLM+TTS per install — the cheapest marketing we will ever buy.

## Quality bar (release-blocking QA)

Every letter must pass: ≥3 verbatim user tokens present · name in first sentence · no template phrases from a banned list ("in this journey," "unlock your potential," "the universe has plans") · struggle referenced once, gently, never quoted mockingly · length 140–220 spoken words · reading level conversational. Automated checks + human spot-review pre-launch.

## Micro-wow descendants (the letter's echoes — see 10, 16)

Day-7 / Day-30 / Day-100 milestone letters; anniversary echo ("A month ago today you told me about {struggle}. Here's the moment I made for that day — and here's today's."); occasional remembered-detail injections in daily moments. The first Letter is the covenant; the echoes are proof it was kept.
