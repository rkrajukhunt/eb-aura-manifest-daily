import * as ATT from 'expo-tracking-transparency';
import { Platform } from 'react-native';

import { requestTrackingPermission } from './tracking';

const getPerms = ATT.getTrackingPermissionsAsync as jest.Mock;
const requestPerms = ATT.requestTrackingPermissionsAsync as jest.Mock;

describe('requestTrackingPermission', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requests only when status is undetermined and reports the outcome', async () => {
    Platform.OS = 'ios';
    getPerms.mockResolvedValueOnce({ status: 'undetermined' });
    requestPerms.mockResolvedValueOnce({ status: 'granted' });
    await expect(requestTrackingPermission()).resolves.toBe(true);
    expect(requestPerms).toHaveBeenCalledTimes(1);
  });

  it('reports a prior grant without re-asking', async () => {
    Platform.OS = 'ios';
    getPerms.mockResolvedValueOnce({ status: 'granted' });
    await expect(requestTrackingPermission()).resolves.toBe(true);
    expect(requestPerms).not.toHaveBeenCalled();
  });

  it('reports a denial as tracking-off', async () => {
    Platform.OS = 'ios';
    getPerms.mockResolvedValueOnce({ status: 'denied' });
    await expect(requestTrackingPermission()).resolves.toBe(false);
    expect(requestPerms).not.toHaveBeenCalled();
  });

  it('reports a restricted prompt as tracking-off', async () => {
    Platform.OS = 'ios';
    getPerms.mockResolvedValueOnce({ status: 'restricted' });
    await expect(requestTrackingPermission()).resolves.toBe(false);
    expect(requestPerms).not.toHaveBeenCalled();
  });

  it('is a no-op on Android and reports tracking-as-allowed', async () => {
    Platform.OS = 'android';
    await expect(requestTrackingPermission()).resolves.toBe(true);
    expect(getPerms).not.toHaveBeenCalled();
    expect(requestPerms).not.toHaveBeenCalled();
  });
});
