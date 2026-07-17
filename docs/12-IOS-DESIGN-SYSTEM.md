# 12 — iOS DESIGN SYSTEM (conceptual)

## Design principles

1. **Calm is the brand.** Whitespace, soft gradients, unhurried motion. Nothing shouts.
2. **Typography is the hero.** Affirmations and letters ARE the product; type gets the budget.
3. **iOS-native feel in React Native.** SF-conventions for spacing/nav/sheets; platform gestures; Dynamic Type; Dark Mode from day one.
4. **Depth without glass soup.** One gradient family, subtle elevation, glassy cards used sparingly (player, hero cards) — never everywhere.
5. **Emotional design intentionally:** color/motion shifts follow the user's journey (onboarding dawn → letter dusk), not decoration.

## Color philosophy & tokens

Grounded in the research palette (lavender = blue's calm + pink's warmth) and the competitor world (pink→lavender→purple gradients) but _more restrained_ — Aya's editorial calm over Stella's glassy density.

- Primary **Soft Lavender** `#B5A9D6` · Secondary **Sky Blue** `#A8D0E6` · Support **Sage** `#B7C9A8` (growth/becoming accents)
- Neutrals: **Warm White** `#FBF9F6` (base), **Sand** `#EDE6DD` (surfaces)
- Blush accent `#F3D9DE` (sparingly — self-compassion moments)
- CTA **Deep Periwinkle** `#6C63B5` (the single high-contrast color; buttons, active tab, play)
- Gradients: vertical, warm-white top → lavender → dusk purple; the Letter deepens toward `#2A2540`.
- **Dark mode:** plum-charcoal base `#1E1B2E`, lavender-tinted surfaces `#2A2540`, soft lavender/blush text. Warm, never harsh black/white.
- **Avoid:** saturated red/neon (fight-or-flight), stark clinical white, celebratory confetti anywhere near vulnerable content.

## Typography hierarchy

- **Display serif** (elegant, slightly literary — e.g., a refined transitional serif): letter text, moment titles (italic for titles), affirmation cards. Large & airy: Letter lines ~28–34pt, affirmation hero ~26–30pt.
- **Text sans** (humanist, highly legible — SF Pro or Inter): body, UI, inputs.
- **Label style:** uppercase letter-spaced sans, 11–12pt, 60% opacity ("TODAY'S MOMENT", "COMING FOR YOU") — the category's signature wayfinding.
- Dynamic Type: all text scales; affirmation/letter type scales within min/max clamps; chips reflow to lists at accessibility sizes.

## Spacing philosophy

8pt grid. Generous by default: screen margins 24, card padding 20–24, section gaps 32–40. Whitespace is the premium signal; when in doubt, add space and cut an element.

## Surfaces & components

- **Backgrounds:** full-bleed soft gradient per screen family; content floats on it.
- **Cards:** rounded 20–24 radius; two kinds — _solid warm_ (Sand/​surface, default) and _glassy translucent_ (hero: Today's Moment, player) with subtle border + faint shadow.
- **Buttons:** Primary = filled periwinkle pill, 52pt height, white label; Secondary = tinted text button; destructive = quiet red text only inside confirms. Press: scale 0.97 + light haptic.
- **Inputs:** borderless on card surface, large 17pt text, soft focus glow (lavender), floating Continue above keyboard; never harsh validation reds — gentle inline copy instead.
- **Navigation:** floating pill tab bar (4 tabs + subtle center "+" on Home), SF Symbols-weight icons, active = periwinkle; large-title pattern on list screens.
- **Bottom sheets:** native detents (medium/large), grabber, background dim 40%, spring presentation — every input flow lives here.
- **Modals/full-screen covers:** the Letter/milestones present as covers with their own world (no chrome).
- **Icons:** thin-to-regular weight, rounded, SF-Symbols-first; emoji allowed as collection glyphs (Stella pattern) but never in system copy.
- **Illustrations:** minimal at V1 — the orb carries the brand; dream-home cards use soft line illustrations, diverse and warm (Headspace lesson), never stocky.

## Signature elements

- **The Orb (Aura's presence):** a soft iridescent sphere with a 4s breathing cycle. States: idle (slow breath) · listening/typing (gentle shimmer) · generating (slightly faster breath + inner light) · speaking (amplitude-reactive glow synced to audio). It is the companion's _body_ — it appears in onboarding, generation, and the player. Never bounces, never cartoons.
- **Audio player:** full-screen; orb center; italic-serif title; transport (play/pause 64pt, ±15s, scrubber with times, speed); Read toggle; favorite heart; Refine entry. Mini-player: slim bar above tab bar (title + remaining time + play/pause).
- **Affirmation cards:** full-height, gradient or user-photo background (share flow), serif affirmation + small uppercase mantra line, heart + share. Export renders at 1080×1920 clean (subtle brand mark, no UI chrome).
- **Loading states:** the orb + one line of in-voice copy — never bare spinners. Skeletons (soft shimmer on Sand) only for lists/library.
- **Empty states:** one warm sentence + one action, in companion voice ("Hearts live here. Your first Letter already does."). Never illustrations of emptiness/sad states.
