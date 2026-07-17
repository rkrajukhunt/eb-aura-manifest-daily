import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

import { ThemeProvider } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

import { Screen } from './Screen';

// The gradient is a native view manager with no jest implementation; a plain
// View keeps the tree renderable while the colors stay on props for assertion.
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }: { children?: ReactNode }) =>
      React.createElement(View, props, children),
  };
});

// Real provider with synchronous metrics — the native measurement never
// arrives under jest, and without metrics SafeAreaView renders nothing.
const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function wrapper({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>{children}</ThemeProvider>
    </SafeAreaProvider>
  );
}

/** The safe-area container is the gradient's only child. */
function contentStyle() {
  const gradient = screen.getByTestId('screen');
  const [content] = gradient.children;
  if (!content || typeof content === 'string') {
    throw new Error('expected the safe-area container');
  }
  return StyleSheet.flatten(content.props.style);
}

describe('Screen', () => {
  it('renders its children on the gradient', async () => {
    await render(
      <Screen testID="screen">
        <Text>Today's Moment</Text>
      </Screen>,
      { wrapper },
    );

    expect(screen.getByText("Today's Moment")).toBeTruthy();
    expect(screen.getByTestId('screen')).toBeTruthy();
  });

  it('applies the standard screen margin by default (product 12)', async () => {
    await render(
      <Screen testID="screen">
        <Text>content</Text>
      </Screen>,
      { wrapper },
    );

    expect(contentStyle()).toMatchObject({ paddingHorizontal: layout.screenMargin });
  });

  it('drops the margin when edge-to-edge — covers own their surface', async () => {
    await render(
      <Screen testID="screen" edgeToEdge>
        <Text>cover</Text>
      </Screen>,
      { wrapper },
    );

    expect(contentStyle().paddingHorizontal).toBeUndefined();
  });

  it('merges a caller style into the content container', async () => {
    await render(
      <Screen testID="screen" style={{ justifyContent: 'center' }}>
        <Text>content</Text>
      </Screen>,
      { wrapper },
    );

    expect(contentStyle()).toMatchObject({
      justifyContent: 'center',
      paddingHorizontal: layout.screenMargin,
    });
  });
});
