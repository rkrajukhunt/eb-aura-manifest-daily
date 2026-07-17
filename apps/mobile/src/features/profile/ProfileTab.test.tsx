import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { profileCopy } from '@/copy/profile';
import { ThemeProvider } from '@/theme/ThemeProvider';

import * as api from './api';
import { ProfileTab } from './ProfileTab';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/lib/analytics', () => ({
  analytics: { capture: jest.fn() },
  initAnalytics: jest.fn(),
}));
jest.mock('@/stores/appState', () => ({
  useAppState: (selector: (s: { status: string; userId: string }) => unknown) =>
    selector({ status: 'ready', userId: 'user-1' }),
}));
jest.mock('./api');
jest.mock('@/hooks/useProfile', () => ({
  profileKeys: { detail: (id: string) => ['profile', id] },
  useProfile: () => ({
    data: {
      user_id: 'user-1',
      name: 'Maya',
      self_description: 'restless in a good way',
      dream_city: 'Lisbon',
      dream_home: 'cozy-cottage',
      free_text_note: null,
    },
  }),
}));

const mockedApi = api as jest.Mocked<typeof api>;

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <ThemeProvider forceScheme="light">
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
}

describe('ProfileTab (product 11: trust center)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.fetchPeople.mockResolvedValue([
      {
        id: 'p1',
        user_id: 'user-1',
        name: 'Ivy',
        descriptor: 'safe',
        active: true,
        created_at: '',
        updated_at: '',
      },
    ]);
  });

  it('shows what Aura currently believes, field by field', async () => {
    const view = await render(<ProfileTab />, { wrapper });

    expect(await view.findByText('Maya')).toBeTruthy();
    expect(view.getByText('restless in a good way')).toBeTruthy();
    expect(view.getByText('Lisbon')).toBeTruthy();
  });

  it('lists her people with a remove that deactivates, never deletes', async () => {
    const view = await render(<ProfileTab />, { wrapper });
    mockedApi.deactivatePerson.mockResolvedValue(undefined);

    await view.findByText('Ivy — safe');
    await fireEvent.press(view.getByText(profileCopy.people.remove));

    expect(mockedApi.deactivatePerson).toHaveBeenCalledWith('p1');
  });

  it('opens the edit sheet and shows the memory contract after saving', async () => {
    mockedApi.updateProfileField.mockResolvedValue(undefined);
    const view = await render(<ProfileTab />, { wrapper });

    await fireEvent.press(await view.findByLabelText(profileCopy.fields.dreamCity));
    await fireEvent.changeText(view.getByDisplayValue('Lisbon'), 'Porto');
    await fireEvent.press(view.getByLabelText(profileCopy.edit.save));

    expect(mockedApi.updateProfileField).toHaveBeenCalledWith('user-1', 'dream_city', 'Porto');
    // "I'll write differently from now on" — the contract made visible (product 10 §44).
    expect(await view.findByText(profileCopy.edit.savedNote)).toBeTruthy();
  });

  it('routes the note through the free-text write path — it feeds memory', async () => {
    mockedApi.saveFreeTextNote.mockResolvedValue(undefined);
    const view = await render(<ProfileTab />, { wrapper });

    await fireEvent.press(await view.findByLabelText(profileCopy.fields.note));
    await fireEvent.changeText(view.getByDisplayValue(''), 'The bakery downstairs matters');
    await fireEvent.press(view.getByLabelText(profileCopy.edit.save));

    expect(mockedApi.saveFreeTextNote).toHaveBeenCalledWith(
      'user-1',
      'The bakery downstairs matters',
    );
  });
});
