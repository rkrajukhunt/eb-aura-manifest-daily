/**
 * @aura/shared — the single source of truth for cross-app shapes.
 *
 * Rule (01 §4): mobile and backend NEVER define a request/response or event
 * shape locally. Always import from here. This is what keeps 07's contracts honest.
 */

// Contracts (07)
export * from './contracts/health';
export * from './contracts/errors';

// Analytics catalog (13, product 17)
export * from './events/types';
export * from './events/client';

// Constants (04 §86, product 09)
export * from './constants/limits';

// DB row types — generated from Supabase, re-exported here for both apps.
export * from './types/database';
