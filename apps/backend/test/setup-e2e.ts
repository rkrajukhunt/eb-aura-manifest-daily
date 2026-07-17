/**
 * Runs before the test file is imported — which matters, because AppModule
 * evaluates `ConfigModule.forRoot({ validate })` at import time. Setting these in
 * a `beforeAll` would be too late and boot would fail env validation.
 *
 * Values are fake by design: the suite uses mock providers and stubs fetch, so
 * nothing here reaches a real service.
 */
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://supabase.local';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.LLM_PROVIDER = 'mock';
process.env.TTS_PROVIDER = 'mock';

// Keep Sentry inert in tests.
delete process.env.SENTRY_DSN_BACKEND;
