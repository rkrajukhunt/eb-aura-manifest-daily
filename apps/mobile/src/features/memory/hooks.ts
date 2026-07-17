import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addNeverIncludeTerm,
  deleteMemoryItem,
  fetchMemoryItems,
  fetchNeverInclude,
  removeNeverIncludeTerm,
  type MemoryItem,
} from './api';

/** Namespaced per feature (05 §2). */
export const memoryKeys = {
  all: ['memory'] as const,
  items: (userId: string) => [...memoryKeys.all, 'items', userId] as const,
  neverInclude: (userId: string) => [...memoryKeys.all, 'neverInclude', userId] as const,
};

export function useMemoryItems(userId: string | undefined) {
  return useQuery({
    queryKey: memoryKeys.items(userId ?? 'anonymous'),
    queryFn: () => fetchMemoryItems(userId as string),
    enabled: Boolean(userId),
  });
}

/**
 * Delete is optimistic: the item vanishes the instant she taps confirm.
 *
 * That's the point. This screen is the product's trust surface (product 10) —
 * watching a spinner after asking Aura to forget something reads as hesitation.
 * On failure the row comes back, which is honest.
 */
export function useDeleteMemoryItem(userId: string | undefined) {
  const queryClient = useQueryClient();
  const key = memoryKeys.items(userId ?? 'anonymous');

  return useMutation({
    mutationFn: (item: Pick<MemoryItem, 'id' | 'category'>) => deleteMemoryItem(item),

    onMutate: async (item) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MemoryItem[]>(key);

      queryClient.setQueryData<MemoryItem[]>(key, (old) =>
        (old ?? []).filter((row) => row.id !== item.id),
      );

      return { previous };
    },

    onError: (_error, _item, context) => {
      queryClient.setQueryData(key, context?.previous);
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export function useNeverInclude(userId: string | undefined) {
  return useQuery({
    queryKey: memoryKeys.neverInclude(userId ?? 'anonymous'),
    queryFn: () => fetchNeverInclude(userId as string),
    enabled: Boolean(userId),
  });
}

export function useAddNeverInclude(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (term: string) => addNeverIncludeTerm(userId as string, term),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: memoryKeys.neverInclude(userId ?? '') });
    },
  });
}

export function useRemoveNeverInclude(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => removeNeverIncludeTerm(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: memoryKeys.neverInclude(userId ?? '') });
    },
  });
}
