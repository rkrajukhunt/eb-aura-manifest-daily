import { analytics } from './analytics';
import { emitAppOpen } from './appOpen';
import { kv } from './storage';

jest.mock('./analytics', () => ({
  analytics: { capture: jest.fn() },
  initAnalytics: jest.fn(),
}));

const capture = analytics.capture as jest.Mock;

describe('emitAppOpen', () => {
  beforeEach(() => {
    kv.clearAll();
    capture.mockClear();
  });

  it('fires app_first_open then app_open on a fresh install', () => {
    emitAppOpen('cold');

    expect(capture).toHaveBeenNthCalledWith(1, 'app_first_open');
    expect(capture).toHaveBeenNthCalledWith(2, 'app_open', { source: 'cold' });
  });

  it('never fires app_first_open twice — it is the top of the funnel', () => {
    emitAppOpen('cold');
    capture.mockClear();

    emitAppOpen('cold');

    expect(capture).not.toHaveBeenCalledWith('app_first_open');
    expect(capture).toHaveBeenCalledWith('app_open', { source: 'cold' });
  });

  it('fires app_open on every launch', () => {
    emitAppOpen('cold');
    capture.mockClear();

    emitAppOpen('notification');
    emitAppOpen('background');

    expect(capture).toHaveBeenCalledTimes(2);
    expect(capture).toHaveBeenCalledWith('app_open', { source: 'notification' });
    expect(capture).toHaveBeenCalledWith('app_open', { source: 'background' });
  });

  it('persists the first-open flag so a relaunch does not re-fire', () => {
    emitAppOpen('cold');

    expect(kv.get<boolean>('app.hasOpenedBefore')).toBe(true);
  });
});
