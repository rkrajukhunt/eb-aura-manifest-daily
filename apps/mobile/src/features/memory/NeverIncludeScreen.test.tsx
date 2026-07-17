import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { memoryCopy } from '@/copy/memory';
import { ThemeProvider } from '@/theme/ThemeProvider';

import * as api from './api';
import { NeverIncludeScreen } from './NeverIncludeScreen';

jest.mock('./api');
jest.mock('@/lib/analytics', () => ({
  analytics: { capture: jest.fn() },
  initAnalytics: jest.fn(),
}));
jest.mock('@/stores/appState', () => ({
  useAppState: (selector: (s: { status: string; userId: string }) => unknown) =>
    selector({ status: 'ready', userId: 'user-1' }),
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

describe('NeverIncludeScreen (product 10 §45: sacred)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.fetchNeverInclude.mockResolvedValue([
      { id: 't1', user_id: 'user-1', term: 'my ex', created_at: '' },
    ]);
  });

  it('lists her excluded terms', async () => {
    const view = await render(<NeverIncludeScreen />, { wrapper });

    expect(await view.findByText('my ex')).toBeTruthy();
  });

  it('adds a term and clears the input', async () => {
    mockedApi.addNeverIncludeTerm.mockResolvedValue(undefined);
    const view = await render(<NeverIncludeScreen />, { wrapper });

    await fireEvent.changeText(view.getByDisplayValue(''), 'the diagnosis');
    await fireEvent.press(view.getByLabelText(memoryCopy.neverInclude.addAction));

    expect(mockedApi.addNeverIncludeTerm).toHaveBeenCalledWith('user-1', 'the diagnosis');
    expect(view.getByDisplayValue('')).toBeTruthy();
  });

  it('ignores an empty add rather than erroring', async () => {
    const view = await render(<NeverIncludeScreen />, { wrapper });

    await fireEvent.press(view.getByLabelText(memoryCopy.neverInclude.addAction));

    expect(mockedApi.addNeverIncludeTerm).not.toHaveBeenCalled();
  });

  it('removes a term', async () => {
    mockedApi.removeNeverIncludeTerm.mockResolvedValue(undefined);
    const view = await render(<NeverIncludeScreen />, { wrapper });

    await view.findByText('my ex');
    await fireEvent.press(view.getByLabelText(memoryCopy.neverInclude.removeAction));

    expect(mockedApi.removeNeverIncludeTerm).toHaveBeenCalledWith('t1');
  });
});
