import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { onboardingCopy, type TimeKey } from '@/copy/onboarding';
import { haptic } from '@/theme/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

import { AnswerRow } from '../AnswerRow';
import { ConversationScreen } from '../ConversationScreen';
import { useConversation } from '../useConversation';

export const SLOTS_BY_CATEGORY: Record<TimeKey, readonly string[]> = {
  morning: [
    '7:00am',
    '7:15am',
    '7:30am',
    '7:45am',
    '8:00am',
    '8:15am',
    '8:30am',
    '8:45am',
    '9:00am',
  ],
  lunch: [
    '12:00pm',
    '12:15pm',
    '12:30pm',
    '12:45pm',
    '1:00pm',
    '1:15pm',
    '1:30pm',
    '1:45pm',
    '2:00pm',
  ],
  evening: [
    '6:00pm',
    '6:15pm',
    '6:30pm',
    '6:45pm',
    '7:00pm',
    '7:15pm',
    '7:30pm',
    '7:45pm',
    '8:00pm',
  ],
  'before-bed': [
    '9:00pm',
    '9:15pm',
    '9:30pm',
    '9:45pm',
    '10:00pm',
    '10:15pm',
    '10:30pm',
    '10:45pm',
    '11:00pm',
  ],
};

/**
 * Q11 — time and commitment. The implementation intention lives in the button
 * label: "I'll do this at 8:15am". Fine-tunes arrival time to 15-minute slots based on
 * option selection.
 */
export function A08RitualTime() {
  const { colors, radii, shadows, spacing } = useTheme();
  const { submit, existingValue } = useConversation('a08-ritual-time');
  const c = onboardingCopy.a08RitualTime;

  const parseExisting = () => {
    if (typeof existingValue === 'string') {
      const choice = c.choices.find((t) => t.key === existingValue);
      if (choice) return { key: choice.key as TimeKey, time: choice.time };
      return { key: null, time: c.choices[0]!.time };
    }
    if (typeof existingValue === 'object' && existingValue !== null) {
      const obj = existingValue as { key?: TimeKey; time?: string };
      if (obj.key && obj.time) return { key: obj.key, time: obj.time };
    }
    return { key: null, time: c.choices[0]!.time };
  };

  const initial = parseExisting();
  const [selectedKey, setSelectedKey] = useState<TimeKey | null>(initial.key);
  const [selectedTime, setSelectedTime] = useState<string>(initial.time);

  const activeCategory = selectedKey ?? 'morning';
  const availableSlots = SLOTS_BY_CATEGORY[activeCategory] ?? SLOTS_BY_CATEGORY.morning;

  const handleSelectCategory = (key: TimeKey) => {
    setSelectedKey(key);
    const defaultTime = c.choices.find((t) => t.key === key)?.time ?? SLOTS_BY_CATEGORY[key][0]!;
    setSelectedTime(defaultTime);
    void haptic('onboardingContinue');
  };

  const handleSelectSlot = (slot: string) => {
    setSelectedTime(slot);
    void haptic('onboardingContinue');
  };

  const handleSubmit = () => {
    if (!selectedKey) return;
    void submit({ key: selectedKey, time: selectedTime });
  };

  return (
    <ConversationScreen
      testID="a08-ritual-time"
      screenId="a08-ritual-time"
      question={c.question}
      primaryTitle={c.primary.replace('{time}', selectedTime)}
      onPrimary={handleSubmit}
      primaryDisabled={selectedKey === null}
    >
      <View style={{ gap: spacing.sm + 1 }}>
        {c.choices.map((option) => (
          <AnswerRow
            key={option.key}
            label={option.label}
            selected={selectedKey === option.key}
            onPress={() => handleSelectCategory(option.key)}
            testID={`a08-ritual-time-${option.key}`}
          />
        ))}
      </View>

      {/* Fine-Tune Card with 15-minute slot selector */}
      <View
        style={{
          marginTop: spacing.md,
          padding: spacing.md + 2,
          borderRadius: radii.card,
          backgroundColor: colors.surface.card,
          borderWidth: 1,
          borderColor: colors.surface.border,
          gap: spacing.sm + 2,
          ...shadows.card,
        }}
      >
        {/* Card Header */}
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Text
            style={{
              fontFamily: fonts.sansSemiBold,
              fontSize: 12,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              color: colors.text.secondary,
            }}
          >
            {c.fineTune}
          </Text>
          <Text
            allowFontScaling={false}
            style={{
              fontFamily: fonts.serifSemiBold,
              fontSize: 24,
              color: colors.accent.emberDeep,
            }}
          >
            {selectedTime}
          </Text>
        </View>

        {/* 15-Min Slots Scrollable Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.xs + 2, paddingVertical: 2 }}
        >
          {availableSlots.map((slot) => {
            const isSelected = selectedTime === slot;
            return (
              <TouchableOpacity
                key={slot}
                activeOpacity={0.7}
                onPress={() => handleSelectSlot(slot)}
                testID={`a08-ritual-time-slot-${slot}`}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs + 3,
                  borderRadius: radii.pill,
                  backgroundColor: isSelected ? colors.accent.emberDeep : colors.accent.parchment,
                  borderWidth: 1,
                  borderColor: isSelected ? colors.accent.emberDeep : colors.surface.border,
                }}
              >
                <Text
                  style={{
                    fontFamily: isSelected ? fonts.sansSemiBold : fonts.sans,
                    fontSize: 13,
                    color: isSelected ? colors.text.onCta : colors.text.primary,
                  }}
                >
                  {slot}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </ConversationScreen>
  );
}
