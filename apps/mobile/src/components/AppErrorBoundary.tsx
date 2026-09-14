import { Component, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { captureException } from '@/lib/analytics';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

import { TextButton } from './TextButton';

/**
 * A calm, in-voice fallback (05 §errors — no codes, never a raw stack). A
 * function component so it can read the theme; the class boundary renders it.
 */
function ErrorFallback({ onRetry }: { onRetry: () => void }): ReactNode {
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();
  return (
    <View
      testID="app-error-fallback"
      style={{
        flex: 1,
        backgroundColor: colors.bg.base,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
        gap: spacing.md,
      }}
    >
      <Text
        style={[scaledType('title', scale), { color: colors.text.primary, textAlign: 'center' }]}
      >
        Something slipped for a moment.
      </Text>
      <Text
        style={[scaledType('body', scale), { color: colors.text.secondary, textAlign: 'center' }]}
      >
        Let’s try that again.
      </Text>
      <TextButton title="Try again" onPress={onRetry} testID="app-error-retry" />
    </View>
  );
}

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

/**
 * Top-level React error boundary → PostHog Error Tracking (13 §monitoring).
 *
 * Catches render errors anywhere below it, reports them (id-only context, no
 * user content), and shows the calm fallback instead of a white screen. "Try
 * again" clears the error and re-renders the tree.
 */
export class AppErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown): void {
    captureException(error, { boundary: 'root' });
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}
