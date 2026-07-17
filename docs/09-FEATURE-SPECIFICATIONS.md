# 09 — FEATURE SPECIFICATIONS (V1)

Template per feature: WHY IT EXISTS · USER VALUE · PSYCHOLOGICAL PURPOSE · ENTRY POINT · PRIMARY ACTION · STATES (empty / loading / error / success / returning).

## 9.1 Daily Moment (core content)

WHY: The daily heartbeat; proven Stella/Aya mechanic. VALUE: Hear a scene from your own future life every day. PSYCH: Variable reward + identity rehearsal. ENTRY: Home "Today's Moment" card; arrival notification. PRIMARY: Tap to listen (player: play/pause, scrubber, ±15s, speed, Read mode with synced highlight, favorite heart).
STATES — Empty: never (generation is scheduled ahead; fallback = replay yesterday's + honest "today's is still forming"). Loading: orb + "forming" copy, no spinners. Error: "This one didn't come through. Let me rewrite it." + retry. Success: player; on completion → gentle flow to affirmation. Returning: countdown chip to tomorrow; "Coming for you" previews.
Refine: "Not quite right?" → sheet: More realistic / Softer / More ambitious / Free note → regenerates once + writes a preference memory. (Cost-capped: 1 refine/moment.)

## 9.2 Manifest Anything (on-demand)

WHY: The namesake power feature; converts specific desires into moments. VALUE: "The day I sign my first client" → a moment about exactly that. PSYCH: Agency + investment. ENTRY: Home "+" / empty slot in collections. PRIMARY: Type desire → generate.
STATES — Empty: inspiration placeholder examples drawn from user's own goal area. Loading: same ritual language as Letter (short). Error: retry, credit not consumed. Success: plays; auto-files into a matching collection. Returning: shows remaining weekly credits ("2 left this week — I make them count"). Free tier: locked with calm sheet.
Limits: 3/week premium (EXPERIMENT: tune). Framed as specialness, priced as cost control.

## 9.3 Affirmation Studio ⭐ (founder's key focus)

WHY: Daily habit + share engine + the education wedge no competitor has. VALUE: Affirmations that sound like _your_ life, and the understanding of why they're phrased that way. PSYCH: Identity statements (Clear) grounded in stated values (Steele); self-authorship deepens belief.
Three modes:
a) **Today's affirmation** — one/day, generated from profile + recent gratitude/refine signals, user's words, present tense. Card-first, "one a day, that's enough" countdown after viewing.
b) **Guided generation** — the question flow: "What's this for?" (goal area chips + free text) → "How do you want to feel?" (feeling chips) → "How should it sound?" (Gentle / Bold / Grounded) → 3 candidates → pick/edit/save. Each candidate shows a one-line _why_: "Present tense — your mind rehearses it as already true."
c) **Technique framing (V1 inline)** — small "Technique" chips on cards: _Identity ("I am…")_, _369 practice_ ("write it 3× this morning, 6× today, 9× tonight" with a simple counter), _Scripting_ (a one-paragraph prompt in their context). Full Learn library = V1.1.
ENTRY: Affirmations tab; post-moment flow. PRIMARY: Reveal today's / Create with Aura.
STATES — Empty (collection): "Your kept words will live here" + create CTA. Loading: card shimmer ≤1.5s. Error: yesterday's card + retry. Success: card + save/share. Returning: countdown + collection grid.
Share-as-image: clean typographic card, subtle brand mark, no user personal data beyond the affirmation text itself (privacy rule 18).

## 9.4 Gratitude (minimal V1) ⭐

WHY: Founder's key focus; retention glue; the cheapest memory-feed we have. VALUE: One line a day that the app actually _uses_. PSYCH: Gratitude regulates the anxious open-state; entries becoming moment-details later = the "it remembers me" engine.
ENTRY: Gratitude tab; post-affirmation flow ("One thing from today?"). PRIMARY: Type one line (AI prompt personalizes: "You mentioned {person} yesterday — anything from them today?"). Optional: AI can suggest a starter if the field stays empty 5s ("Even 'my coffee this morning' counts").
STATES — Empty (history): "Your first line starts the record." Loading: none needed (local write, background sync). Error: saved locally, syncs silently. Success: soft tick haptic + weekday dot fills; "Kept." Returning: week dots (no break-state), scrollable history.
Memory contract shown once: "What you write here may return in your moments. That's the point." (Deletable per-entry.)
V2: automated weaving into moments; V1 does light weaving via the daily-moment prompt context.

## 9.5 Favorites / Library

WHY: Investment + offline replay value. VALUE: Keep what moved you. PSYCH: Endowment; the library IS the switching cost. ENTRY: heart on any moment/affirmation/letter. STATES — Empty: "Hearts live here. Your first Letter already does." Success: cached for offline. Free tier: letter kept; further favorites = premium.

## 9.6 Notifications

WHY: The companion's voice outside the app; Calm's 3x lever. RULES: personal, in-voice, name-first ("Julia — this morning's is about the studio."); arrival at chosen time; optional affirmation nudge (Aya-style frequency: quiet / once a day / your hours). HARD RULE: no notification exists purely to reopen the app; zero guilt copy; auto-soften after 3 ignored. Permission asked post-paywall with banked context.

## 9.7 Profile & "What Aura Knows"

WHY: Trust + the memory's front door. Editable: basics (name, city, what you do — optional), dream (home/city/values/struggle), people (add/remove, descriptors), lifestyle tags, **Never Include** list, "Anything Aura should know?" free text. Memory transparency screen lists remembered items in plain language with per-item delete (see 10). Edits reshape future generations, stated explicitly ("I'll write differently from now on").

## 9.8 Paywall & Subscription

See 15. In-app states: subscription status, manage (2 taps to App Store management), restore.

## 9.9 Settings

Subscription · notification preferences · voice (if 2 shipped) · support · rate & share · terms/privacy · **Delete account & data** (full wipe, typed confirmation, grace copy without dark-pattern retention walls).
