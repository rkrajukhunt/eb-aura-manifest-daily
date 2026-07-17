import { Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { TextButton } from './TextButton';

export interface EmptyStateProps {
  /** The in-voice sentence ("Hearts live here. Your first Letter already does."). */
  message: string;
  actionTitle?: string;
  onAction?: () => void;
}

/**
 * Empty state (product 12 §empty states): one warm sentence + one action.
 * There is deliberately no image/icon prop — "never illustrations of
 * emptiness/sad states"; the companion's voice carries the moment, and an
 * empty-box graphic would turn a beginning into an absence.
 */
export function EmptyState({ message, actionTitle, onAction }: EmptyStateProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={{ alignItems: 'center', gap: spacing.sm }}>
      <Text style={[typography.body, { color: colors.text.secondary, textAlign: 'center' }]}>
        {message}
      </Text>
      {actionTitle !== undefined && onAction !== undefined && (
        <TextButton title={actionTitle} onPress={onAction} />
      )}
    </View>
  );
}
