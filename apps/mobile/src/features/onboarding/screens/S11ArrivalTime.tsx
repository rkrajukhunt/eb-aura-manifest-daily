import { useState } from 'react';
import { View } from 'react-native';

import { Chip, Label } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';

import { ConversationScreen } from '../ConversationScreen';
import { useConversation } from '../useConversation';

/**
 * Hour presets for "pick a time". A native wheel picker is a new native module
 * (dev-client rebuild) for one screen — hour granularity serves the arrival
 * cron's 15-minute windows fine (04 §5). Deviation noted in the plan; a wheel
 * can replace this row in Phase 12 polish without touching the data shape.
 */
const HOUR_CHOICES = ['06:00', '07:00', '08:00', '09:00', '12:00', '18:00', '20:00', '21:00'];

/**
 * S11: the reminder-in-onboarding lever (product 07 — Calm's 3× retention move).
 * The OS notification permission is NOT asked here: it comes after the Letter
 * and paywall with this context banked (Phase 9) — priming without the scary
 * dialog mid-conversation.
 */
export function S11ArrivalTime() {
  const { spacing } = useTheme();
  const { submit, existingValue } = useConversation('s11-arrival-time');

  const [choice, setChoice] = useState<string | null>(
    typeof existingValue === 'string' ? existingValue : null,
  );
  const [showHours, setShowHours] = useState(false);

  return (
    <ConversationScreen
      testID="s11-arrival-time"
      question={onboardingCopy.s11ArrivalTime.question}
      primaryTitle={onboardingCopy.s11ArrivalTime.primary}
      onPrimary={() => void submit(choice)}
      primaryDisabled={choice === null}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <Chip
          label={onboardingCopy.s11ArrivalTime.morning}
          selected={choice === 'morning'}
          onPress={() => {
            setChoice('morning');
            setShowHours(false);
          }}
        />
        <Chip
          label={onboardingCopy.s11ArrivalTime.evening}
          selected={choice === 'evening'}
          onPress={() => {
            setChoice('evening');
            setShowHours(false);
          }}
        />
        <Chip
          label={onboardingCopy.s11ArrivalTime.pickTime}
          selected={showHours}
          onPress={() => setShowHours(true)}
        />
      </View>

      {showHours && (
        <View style={{ gap: spacing.sm }}>
          <Label>PICK AN HOUR</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {HOUR_CHOICES.map((hour) => (
              <Chip
                key={hour}
                label={hour}
                selected={choice === hour}
                onPress={() => setChoice(hour)}
              />
            ))}
          </View>
        </View>
      )}
    </ConversationScreen>
  );
}
