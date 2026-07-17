import { kv, STORAGE_KEYS } from './storage';

describe('kv', () => {
  afterEach(() => kv.clearAll());

  it('round-trips a JSON value', () => {
    kv.set(STORAGE_KEYS.onboardingDraft, { screen: 's03-name', name: 'Ada' });

    expect(kv.get(STORAGE_KEYS.onboardingDraft)).toEqual({ screen: 's03-name', name: 'Ada' });
  });

  it('returns undefined for a key that was never set', () => {
    expect(kv.get('nope')).toBeUndefined();
  });

  it('drops a corrupt value instead of throwing', () => {
    // A crash here would mean a failed launch — an onboarding draft is never
    // worth that (05 §3).
    kv.set('broken', { ok: true });
    // Simulate corruption by writing a raw non-JSON string past the typed helper.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { storage } = require('./storage');
    storage.set('broken', '{not json');

    expect(kv.get('broken')).toBeUndefined();
    expect(storage.getString('broken')).toBeUndefined();
  });

  it('clearAll wipes everything — delete means delete (14 §6)', () => {
    kv.set('a', 1);
    kv.set('b', 2);

    kv.clearAll();

    expect(kv.get('a')).toBeUndefined();
    expect(kv.get('b')).toBeUndefined();
  });
});
