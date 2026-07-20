import { useEffect } from 'react';

import { Screen } from '@/components';
import { gratitudeCopy } from '@/copy/gratitude';
import { GratitudeScreen } from '@/features/gratitude/GratitudeScreen';
import { useGratitude } from '@/features/gratitude/useGratitude';
import { fetchPeople } from '@/features/profile/api';
import { useAppState } from '@/stores/appState';
import { useQuery } from '@tanstack/react-query';

/**
 * The Gratitude tab (product 09 §9.4). The route resolves the prompt and owns
 * the save; `GratitudeScreen` is pure presentation.
 */
export default function GratitudeRoute() {
  const userId = useAppState((s) => s.userId);
  const gratitude = useGratitude(userId ?? undefined);
  // Reuses Phase 4's fetcher rather than adding a parallel one — the people
  // list has exactly one shape and one source.
  const { data: people } = useQuery({
    queryKey: ['people', userId ?? 'anonymous'],
    queryFn: () => fetchPeople(userId as string),
    enabled: Boolean(userId),
  });

  // Personalized when we have someone of hers to ask about — that specificity
  // is the difference between a journaling prompt and Aura asking (09 §9.4).
  const person = people?.[0]?.name ?? null;
  const personalized = person !== null;
  const prompt = personalized
    ? gratitudeCopy.personalizedPrompt.replace('{person}', person)
    : gratitudeCopy.prompt;

  // The contract is shown once; acknowledging it on view is what makes "once"
  // true rather than "every time she happens not to scroll past it".
  useEffect(() => {
    if (gratitude.showContract) gratitude.acknowledgeContract();
  }, [gratitude]);

  return (
    <Screen testID="gratitude" edgeToEdge>
      <GratitudeScreen
        prompt={prompt}
        dots={gratitude.dots}
        history={gratitude.history}
        todaysEntry={gratitude.todaysEntry}
        showContract={gratitude.showContract}
        onSave={(entry) => gratitude.save(entry, prompt, personalized)}
      />
    </Screen>
  );
}
