# 18 — PRIVACY & SAFETY

An app that "knows you" carries real responsibility. These are product requirements, not legal afterthoughts. Trust is our positioning (01-Principle 3, 5, 10) — privacy failures are brand failures.

## Data principles

1. **Minimum collection:** we ask only what generation uses. Age/gender/career optional. No contacts import, no location, no ad SDKs, no data sale — ever.
2. **Confidentiality promise kept literally:** "Nothing you share leaves this room" = user content is used only to generate _their_ content. Free-text (struggles, gratitude, self-description) never enters analytics, marketing, or model-training pipelines beyond serving that user. LLM/TTS vendors must be under no-training/no-retention terms (verify in technical planning).
3. **Transparency:** "What Aura Knows" shows every memory in plain language with per-item delete (10). Privacy policy written in the same plain voice.
4. **Delete means delete:** account deletion (2 taps + typed confirm) wipes profile, memories, entries, generated text and audio, within a stated window. Lapsed ≠ deleted: lapsed users keep data unless they delete.
5. **Sensitive tier handling:** struggles/fears: never in notifications, share cards, titles, or analytics; referenced only gently in-content, only in the user's words; user can mark any topic "done/private" → full exclusion.
6. **Never-Include is a hard filter:** applied in prompt construction AND post-generation checks; a leak is a P1 bug.

## Emotional safety (duty of care — RESEARCH CAVEAT baked into product)

- **Grounded framing:** moments narrate agency ("you did the work"), never magical passivity; techniques taught as mental rehearsal/attention/identity practice; no promised outcomes, no health claims, no financial claims ("manifest wealth" framing avoided in product copy).
- **Crisis path:** free-text inputs pass a crisis-language check (self-harm, abuse, acute distress). On trigger: the companion responds with warmth, does NOT generate manifestation content on that theme, and surfaces help gently: "Some things are heavier than an app should hold alone. If you're in a hard place, talking to someone can help — here are people who will listen." Region-appropriate resources; no diagnosis, no clinical language, conversation never blocked.
- **No manipulation of vulnerability:** no paywall, upsell, or retention mechanic adjacent to disclosed struggles; memories never fuel purchase pressure (10-Principle 5).
- **Minors:** 17+ App Store rating; not designed for or marketed to minors.
- **Toxic-positivity guard:** the companion validates hard days ("Today was heavy. That's allowed.") before any reframe; affirmations remain plausible stretches, not denial.

## Platform & compliance checklist

- App Store: subscription terms displayed per guidelines; restore purchase; no misleading trial copy (Stella's review history is the cautionary case); privacy nutrition labels accurate; ATT not needed (no tracking).
- GDPR/CCPA-grade rights even at V1: access (What Aura Knows), rectification (edit), erasure (delete), export (V1.1: "download my data").
- Push permission asked in context, post-value; granular controls honored; auto-soften on ignore.
- V2 own-voice cloning: explicit consent flow, voice data deletable, never used beyond the user's own audio, vendor terms verified (privacy + platform-policy risk flagged in research).
- Security baseline for technical planning: encryption in transit + at rest, row-level security on user data (Supabase RLS), audio URLs signed/expiring, secrets server-side only.

## Content boundaries for generation

No medical/mental-health treatment claims · no guaranteed outcomes · no content about Never-Include items · no third-party real-person content beyond the user's own named people in their own life narrative · romantic "specific person" desires handled as the user's feelings and future, never scripts to control another person.
