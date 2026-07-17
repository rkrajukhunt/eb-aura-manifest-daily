import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import type { ReactNode } from 'react';

import { memoryCopy } from '@/copy/memory';

import * as api from './api';
import { WhatAuraKnows } from './WhatAuraKnows';

jest.mock('./api');
jest.mock('@/lib/analytics', () => ({
  analytics: { capture: jest.fn() },
  initAnalytics: jest.fn(),
}));

// Stubbed rather than driven via setState: writing to a real Zustand store from
// beforeEach re-renders components still mounted from earlier tests, outside
// act(). The store's own behaviour is not what this suite is testing.
jest.mock('@/stores/appState', () => ({
  useAppState: (selector: (s: { status: string; userId: string }) => unknown) =>
    selector({ status: 'ready', userId: 'user-1' }),
}));

const mockedApi = api as jest.Mocked<typeof api>;

const item = (over: Partial<api.MemoryItem> = {}): api.MemoryItem =>
  ({
    id: 'item-1',
    user_id: 'user-1',
    category: 'dream',
    tier: 'permanent',
    content: 'Your dream city is Lisbon',
    verbatim: 'Lisbon',
    source: 'onboarding',
    emotional_weight: 3,
    expires_at: null,
    last_used_at: null,
    use_count: 0,
    excluded: false,
    deleted_at: null,
    created_at: '2026-07-17T10:00:00Z',
    updated_at: '2026-07-17T10:00:00Z',
    ...over,
  }) as api.MemoryItem;

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('WhatAuraKnows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists her memories in plain language', async () => {
    mockedApi.fetchMemoryItems.mockResolvedValue([item()]);

    await render(<WhatAuraKnows />, { wrapper });

    expect(await screen.findByText('Your dream city is Lisbon')).toBeTruthy();
  });

  it('shows the memory contract so the screen explains itself', async () => {
    mockedApi.fetchMemoryItems.mockResolvedValue([item()]);

    await render(<WhatAuraKnows />, { wrapper });

    expect(await screen.findByText(memoryCopy.whatAuraKnows.contract)).toBeTruthy();
  });

  it('shows an in-voice empty state rather than a blank screen', async () => {
    mockedApi.fetchMemoryItems.mockResolvedValue([]);

    await render(<WhatAuraKnows />, { wrapper });

    expect(await screen.findByText(memoryCopy.whatAuraKnows.empty)).toBeTruthy();
  });

  it('renders a sensitive item exactly like every other item', async () => {
    // Product requirement, not styling (09 §2, product 10): a badge or lock on
    // her struggle would stigmatize the thing she was bravest to tell us. The
    // tier constrains what generation may spend — it must not change this screen.
    mockedApi.fetchMemoryItems.mockResolvedValue([
      item({ id: 'a', category: 'dream', tier: 'permanent', content: 'Your dream city is Lisbon' }),
      item({
        id: 'b',
        category: 'struggle',
        tier: 'sensitive',
        content: "You told me you're struggling with: feeling stuck",
      }),
    ]);

    await render(<WhatAuraKnows />, { wrapper });

    const sensitive = await screen.findByText("You told me you're struggling with: feeling stuck");
    const ordinary = screen.getByText('Your dream city is Lisbon');

    expect(sensitive.props.style).toEqual(ordinary.props.style);
  });

  it('never shows the category, tier or weight — that would read as a database row', async () => {
    mockedApi.fetchMemoryItems.mockResolvedValue([
      item({ category: 'struggle', tier: 'sensitive' }),
    ]);

    await render(<WhatAuraKnows />, { wrapper });
    await screen.findByText('Your dream city is Lisbon');

    expect(screen.queryByText(/sensitive/i)).toBeNull();
    expect(screen.queryByText(/struggle/i)).toBeNull();
    expect(screen.queryByText(/permanent|evolving/i)).toBeNull();
  });

  describe('delete', () => {
    it('asks for confirmation before forgetting anything', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
      mockedApi.fetchMemoryItems.mockResolvedValue([item()]);

      await render(<WhatAuraKnows />, { wrapper });
      fireEvent.press(await screen.findByLabelText(/Forget this: Your dream city is Lisbon/));

      expect(alertSpy).toHaveBeenCalledWith(
        memoryCopy.whatAuraKnows.deleteConfirmTitle,
        memoryCopy.whatAuraKnows.deleteConfirmBody,
        expect.any(Array),
      );
    });

    it('does not delete when she cancels', async () => {
      jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
      mockedApi.fetchMemoryItems.mockResolvedValue([item()]);

      await render(<WhatAuraKnows />, { wrapper });
      fireEvent.press(await screen.findByLabelText(/Forget this/));

      expect(mockedApi.deleteMemoryItem).not.toHaveBeenCalled();
    });

    it('deletes when she confirms', async () => {
      // Fire the destructive button the component passed to Alert.
      jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
        buttons?.find((b) => b.style === 'destructive')?.onPress?.();
      });
      mockedApi.fetchMemoryItems.mockResolvedValue([item()]);
      mockedApi.deleteMemoryItem.mockResolvedValue(undefined);

      await render(<WhatAuraKnows />, { wrapper });
      fireEvent.press(await screen.findByLabelText(/Forget this/));

      await waitFor(() =>
        expect(mockedApi.deleteMemoryItem).toHaveBeenCalledWith({
          id: 'item-1',
          category: 'dream',
        }),
      );
    });

    it('removes the row immediately — no spinner between her and forgetting', async () => {
      jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
        buttons?.find((b) => b.style === 'destructive')?.onPress?.();
      });
      mockedApi.fetchMemoryItems.mockResolvedValue([item()]);
      mockedApi.deleteMemoryItem.mockReturnValue(new Promise(() => undefined));

      await render(<WhatAuraKnows />, { wrapper });
      fireEvent.press(await screen.findByLabelText(/Forget this/));

      await waitFor(() => expect(screen.queryByText('Your dream city is Lisbon')).toBeNull());
    });

    it('puts the row back if the delete fails — silence would be a lie', async () => {
      jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
        buttons?.find((b) => b.style === 'destructive')?.onPress?.();
      });
      mockedApi.fetchMemoryItems.mockResolvedValue([item()]);
      mockedApi.deleteMemoryItem.mockRejectedValue(new Error('offline'));

      await render(<WhatAuraKnows />, { wrapper });
      fireEvent.press(await screen.findByLabelText(/Forget this/));

      expect(await screen.findByText('Your dream city is Lisbon')).toBeTruthy();
    });
  });
});
