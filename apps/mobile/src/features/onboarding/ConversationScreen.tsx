import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { PillButton, Screen, SerifDisplay, TextButton } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';

import { EditGuardSheet } from './EditGuardSheet';

export interface ConversationScreenProps {
  question: string;
  children?: ReactNode;
  /** Continue. Omit to let the content area drive advancement (chips-only screens). */
  primaryTitle?: string;
  onPrimary?: () => void;
  primaryDisabled?: boolean;
  /** Skip, on the personal questions that allow it (product 07 — never S3). */
  skipTitle?: string;
  onSkip?: () => void;
  /** S1/S2 hide it — there is nothing to fix yet. */
  showEditGuard?: boolean;
  testID?: string;
}

/**
 * The shared shell of the conversation (product 07 rules): one serif question,
 * the answer surface, a floating Continue above the keyboard, and the
 * edit-guard entry. Screens supply only what differs.
 */
export function ConversationScreen({
  question,
  children,
  primaryTitle,
  onPrimary,
  primaryDisabled = false,
  skipTitle,
  onSkip,
  showEditGuard = true,
  testID,
}: ConversationScreenProps) {
  const { spacing } = useTheme();
  const [editGuardOpen, setEditGuardOpen] = useState(false);

  return (
    <Screen {...(testID ? { testID } : {})}>
      <KeyboardAvoidingView
        // The floating-Continue rule (product 07 shared spec): the button rides
        // the keyboard rather than hiding under it.
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingVertical: spacing.xl, gap: spacing.xl }}
        >
          <SerifDisplay variant="title">{question}</SerifDisplay>
          <View style={{ flex: 1, gap: spacing.md }}>{children}</View>
        </ScrollView>

        <View style={{ gap: spacing.sm, paddingBottom: spacing.lg }}>
          {primaryTitle && onPrimary && (
            <PillButton title={primaryTitle} onPress={onPrimary} disabled={primaryDisabled} />
          )}
          {skipTitle && onSkip && <TextButton title={skipTitle} onPress={onSkip} />}
          {showEditGuard && (
            <TextButton
              title={onboardingCopy.editGuard.entry}
              onPress={() => setEditGuardOpen(true)}
            />
          )}
        </View>
      </KeyboardAvoidingView>

      <EditGuardSheet open={editGuardOpen} onClose={() => setEditGuardOpen(false)} />
    </Screen>
  );
}
