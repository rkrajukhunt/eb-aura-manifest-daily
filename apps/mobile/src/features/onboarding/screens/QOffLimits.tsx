import { useState } from 'react';
import { Text, View } from 'react-native';

import { Input } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { useOnboardingDraft } from '@/stores/onboardingDraft';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

import { ConversationScreen } from '../ConversationScreen';
import { OptionChip } from '../OptionChip';
import {
  ADD_YOUR_OWN_ICON,
  CUSTOM_WORD_ICON,
  OFF_LIMITS_TOPIC_ICON,
  OFF_LIMITS_WORD_ICON,
} from '../optionIcons';
import { useConversation } from '../useConversation';

export interface OffLimits {
  words: string[];
  topics: string[];
}

/** Which language answers pre-select the mystical vocabulary as off limits. */
const PREFILL_FOR = new Set(['neuro', 'practical']);

function toggle(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

/**
 * Q8 — off limits. Words and topics she would rather the writing stayed away
 * from, pre-selected from her language answer. The highest-differentiation
 * screen in the flow; Continue works with zero picks, and Skip records none.
 */
export function QOffLimits() {
  const { colors, spacing } = useTheme();
  const { submit, skip, existingValue } = useConversation('q-offlimits');
  const lexicon = useOnboardingDraft((s) => s.answers['q-lexicon']?.value);
  const c = onboardingCopy.qOffLimits;

  const existing = existingValue as Partial<OffLimits> | undefined;
  const [words, setWords] = useState<string[]>(
    existing?.words ??
      (typeof lexicon === 'string' && PREFILL_FOR.has(lexicon) ? [...c.prefill] : []),
  );
  const [topics, setTopics] = useState<string[]>(existing?.topics ?? []);
  // Her own words sit beside the catalog's, already struck through — adding
  // one IS blocking it. Anything recorded that isn't in the catalog is hers.
  const [custom, setCustom] = useState<string[]>(
    (existing?.words ?? []).filter((w) => !c.words.includes(w)),
  );
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const addCustom = () => {
    const word = draft.trim();
    setDraft('');
    setAdding(false);
    if (word === '' || c.words.includes(word) || custom.includes(word)) return;
    setCustom((list) => [...list, word]);
    setWords((w) => (w.includes(word) ? w : [...w, word]));
  };

  const section = (label: string) => (
    <Text
      style={{
        fontFamily: fonts.sans,
        fontSize: 11.5,
        letterSpacing: 1.3,
        textTransform: 'uppercase',
        color: colors.text.label,
        marginBottom: spacing.sm + 3,
      }}
    >
      {label}
    </Text>
  );

  return (
    <ConversationScreen
      testID="q-offlimits"
      screenId="q-offlimits"
      question={c.question}
      helper={c.helper}
      primaryTitle={c.primary}
      onPrimary={() => void submit({ words, topics } satisfies OffLimits)}
      onSkip={() => void skip()}
    >
      <View>
        {section(c.wordsLabel)}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.sm,
            alignItems: 'flex-start',
          }}
        >
          {[...c.words, ...custom].map((word) => (
            <OptionChip
              key={word}
              label={word}
              variant="block"
              icon={OFF_LIMITS_WORD_ICON[word] ?? CUSTOM_WORD_ICON}
              selected={words.includes(word)}
              onPress={() => setWords((w) => toggle(w, word))}
              testID={`q-offlimits-word-${word}`}
            />
          ))}
          {!adding && (
            <OptionChip
              label={c.addYourOwn}
              variant="block"
              icon={ADD_YOUR_OWN_ICON}
              selected={false}
              onPress={() => setAdding(true)}
              testID="q-offlimits-add"
            />
          )}
        </View>
        {adding && (
          <View style={{ marginTop: spacing.sm + 2 }}>
            <Input
              value={draft}
              onChangeText={setDraft}
              placeholder={c.addPlaceholder}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={addCustom}
              testID="q-offlimits-add-input"
            />
          </View>
        )}
      </View>
      <View style={{ marginTop: spacing.md }}>
        {section(c.topicsLabel)}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.sm,
            alignItems: 'flex-start',
          }}
        >
          {c.topics.map((topic) => (
            <OptionChip
              key={topic}
              label={topic}
              variant="block"
              icon={OFF_LIMITS_TOPIC_ICON[topic] ?? CUSTOM_WORD_ICON}
              selected={topics.includes(topic)}
              onPress={() => setTopics((t) => toggle(t, topic))}
              testID={`q-offlimits-topic-${topic}`}
            />
          ))}
        </View>
      </View>
    </ConversationScreen>
  );
}
