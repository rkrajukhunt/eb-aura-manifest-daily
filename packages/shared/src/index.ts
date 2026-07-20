/**
 * @aura/shared — the single source of truth for cross-app shapes.
 *
 * Rule (01 §4): mobile and backend NEVER define a request/response or event
 * shape locally. Always import from here. This is what keeps 07's contracts honest.
 */

// Contracts (07)
export * from './contracts/health';
export * from './contracts/errors';
export * from './contracts/generation';

// Analytics catalog (13, product 17)
export * from './events/types';
export * from './events/client';

// Constants (04 §86, product 09)
export * from './constants/limits';

// Companion-voice ban lists (product 14) — read by the mobile copy lint and the
// backend QA gate alike.
export * from './constants/voice';

// Weekday/month names — the backend QA gate enforces the letter's date-close,
// the mobile player ticks on it. One list so they cannot disagree (product 08).
export * from './constants/dates';

// Living Memory (09) — harvester + seed live here so both apps can run them (09 §1).
export * from './memory/harvester';
export * from './memory/seed';
export * from './memory/weight';
export * from './memory/stopwords';

// DB row types — generated from Supabase, re-exported here for both apps.
export * from './types/database';
