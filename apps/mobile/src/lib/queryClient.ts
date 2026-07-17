import { QueryClient } from '@tanstack/react-query';

/**
 * TanStack Query is the only home for server state (05 §2).
 *
 * Defaults lean offline-tolerant: her last-known Home should render without a
 * connection rather than showing an empty shell (05 §3).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Keep serving the cached value while refetching — no flash of empty state.
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
