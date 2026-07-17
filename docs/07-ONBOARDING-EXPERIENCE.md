# 07 — ONBOARDING EXPERIENCE ("The Conversation")

Rules: one question per screen · companion voice throughout · reflection beats after meaningful answers · edit-guard (revise any answer, never restart) · price transparency before effort · every field maps to a memory slot (10) and a generation variable (08/09).
Shared spec: transitions = soft horizontal push w/ crossfade (350ms, ease-out) · haptic = light impact on Continue, soft success tick on reflections · keyboard: input focused on arrival, Continue floats above keyboard · skip allowed on personal questions (never on name) · free-text minimum 0 chars but gentle nudge if empty ("even one word helps me").

---

**S1 · Welcome**
PURPOSE: Set tone; consent. PSYCH: Calm the charged arrival state; price honesty kills bait fear. INPUT: none. COPY: "Create the life you desire." + "Free to begin. You'll see pricing clearly before anything starts." PRIMARY: Begin. SECONDARY: Restore purchase. DATA: consent ts. USED: legal. ANIM: orb breathing (4s cycle). EDGE: returning user with account → sign-in path.

**S2 · Meet Aura**
PURPOSE: Introduce companion + confidentiality. PSYCH: Safe-space framing unlocks honest answers ("Nothing you say leaves this room"). INPUT: none. COPY: "Hi. I'm Aura. To write your future, I need to know a little about your present. Everything you share stays between us — and you can see and edit everything I remember, anytime." PRIMARY: I'm ready. DATA: none. ANIM: chat-bubble reveal, typing dots 600ms. EDGE: none.

**S3 · Name**
PURPOSE: The key personalization token. PSYCH: Being named = being seen; used within 10s on next screen. INPUT: text (given name). COPY: "What should I call you?" PRIMARY: Continue. DATA: `name` (permanent). USED: every generation, greetings, notifications. HAPTIC: success tick on submit. EDGE: emoji/very long → gentle trim prompt; no validation harshness.

**S4 · Self-description (free text)**
PURPOSE: Capture voice + exact phrases. PSYCH: Reciprocity — depth in = magic out. COPY: "Since we've just met, {name} — how would you describe yourself? Whatever comes to mind." REFLECTION after: one warm echo using their word ("'Restless in a good way.' I like that. Noted."). DATA: `self_description` + extracted `exact_phrases[]`. USED: Letter tone; affirmation voice-matching. EDGE: skipped → reflection becomes "We'll fill this in together as we go."

**S5 · Work feeling (single choice)**
CHOICES: Love it / It's fine for now / Ready for something new / Building something on the side. PSYCH: Low-effort beat between free-texts; plants the change narrative. DATA: `work_feeling`. USED: Letter's "the work you do now" contrast; moment themes. ANIM: chips scale-tap 0.97.

**S6 · What matters most (multi ≤2)**
CHOICES: Feeling truly fulfilled / Financial freedom / Being recognized / Living with purpose / Being free / Family & love. PSYCH: Value-affirmation (Steele) — naming values is itself affirming. DATA: `values[]`. USED: affirmation grounding (values-linked affirmations outperform hype).

**S7 · Dream home (visual single choice)**
CHOICES: 8 illustrated cards (Penthouse / Beach house / Loft / Cozy cottage / Country house / Mountain retreat / Minimalist studio / Anywhere with a view). PSYCH: Sensory concreteness feeds vivid moments. DATA: `dream_home`. USED: scene-setting in Letter/moments. ANIM: card lift on select.

**S8 · Dream city (free text)**
COPY: "And where is it? A real place, or just a feeling of one." REFLECTION: "{city}. I can already hear the mornings there." DATA: `dream_city` (verbatim). USED: Letter opens in this city. EDGE: "not sure" → stored as feeling-word; Letter uses "the place you're still choosing".

**S9 · Your people (add 2–3)**
INPUT: name + one word each ("Mom — safe", "Jane — fun"). PSYCH: Strongest specificity token; reflection beat proves listening ("John's in. Your circle is forming."). DATA: `people[]` (name, descriptor). USED: Letter mentions them by name; future moments seat them at the table. SECONDARY: "Just me for now" (fully supported; Letter adapts to self-focus — EDGE dignity rule). LIMIT: 3 at onboarding (more later in Profile).

**S10 · Current struggle (free text)**
PURPOSE: The emotional core of the Letter. PSYCH: Vulnerability → payoff; must NEVER be followed by a sales beat. COPY: "Last one, and it matters most. What's the thing that feels heaviest right now?" REFLECTION: gentle, non-clinical ("Thank you for trusting me with that. I'll hold it carefully."). DATA: `struggle` (verbatim, sensitive-flagged). USED: Letter references it _in their words_, then shows the morning it became a memory. EDGE: crisis-language detection → warm supportive line + help resources, no generation of that theme (18). Skippable ("Not today" → Letter omits gracefully).

**S11 · Moment arrival time**
PURPOSE: Reminder-in-onboarding (Calm 3x lever). INPUT: Morning / Evening / pick a time. COPY: "Your moments will be written for you daily. When should they arrive?" DATA: `arrival_time`. USED: scheduling + notification. NOTE: OS notification permission is asked LATER (after the Letter/paywall) with this context banked — priming without the scary dialog mid-flow.

**S12 · Generating → THE LETTER → Paywall**
See 08-WOW-MOMENT and 15-MONETIZATION. Generating copy sequence: "Thank you, {name}." → "I'm writing you something." → "It's from someone who knows you very well." (anticipation framing — the wait IS the ritual).

---

## Global edge cases

App killed mid-flow → resume at last answered screen. Offline → answers cached locally, generation queued with honest state ("I'll have it ready the moment we're back online"). Edit-guard sheet accessible from any screen ("Fix an earlier answer"). Accessibility: full VoiceOver labels; Dynamic Type reflows chips to list.

## What we deliberately DON'T ask at onboarding

Age/gender/career (moved to optional Profile — shortens flow, reduces "data harvest" smell), email (Supabase anonymous → account claim later), rating prompt (Aya's in-flow rating is clever but risks the spell; deferred to post-wow D3+ — EXPERIMENT).
