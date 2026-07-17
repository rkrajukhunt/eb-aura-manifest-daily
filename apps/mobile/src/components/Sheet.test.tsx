import { render, screen } from '@testing-library/react-native';
import { createRef, type ReactNode } from 'react';
import { Text } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';

import { ThemeProvider } from '@/theme/ThemeProvider';
import { colorSchemes } from '@/theme/tokens';

import { Sheet } from './Sheet';

// @gorhom/bottom-sheet renders nothing under jest without its native provider
// stack, so the modal is stubbed to a plain View that records its props. What
// stays under test is Sheet's contract: detents, backdrop, surface, ref.
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');

  let lastProps: Record<string, unknown> = {};

  const BottomSheetModal = React.forwardRef(
    (props: { children?: ReactNode } & Record<string, unknown>, ref: unknown) => {
      lastProps = props;
      React.useImperativeHandle(ref, () => ({
        present: jest.fn(),
        dismiss: jest.fn(),
        snapToIndex: jest.fn(),
        close: jest.fn(),
      }));
      return React.createElement(View, { testID: 'sheet-modal' }, props.children);
    },
  );

  return {
    __esModule: true,
    BottomSheetModal,
    BottomSheetBackdrop: () => null,
    useBottomSheetSpringConfigs: (configs: unknown) => configs,
    useBottomSheetTimingConfigs: (configs: unknown) => configs,
    __getLastModalProps: () => lastProps,
  };
});

const { __getLastModalProps } = jest.requireMock('@gorhom/bottom-sheet') as {
  __getLastModalProps: () => Record<string, unknown>;
};

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider forceScheme="light">{children}</ThemeProvider>;
}

describe('Sheet', () => {
  it('renders its children', async () => {
    await render(
      <Sheet>
        <Text>Manifest anything</Text>
      </Sheet>,
      { wrapper },
    );

    expect(screen.getByText('Manifest anything')).toBeTruthy();
  });

  it('exposes the modal ref API for imperative presentation', async () => {
    const ref = createRef<BottomSheetModal>();

    await render(
      <Sheet ref={ref}>
        <Text>content</Text>
      </Sheet>,
      { wrapper },
    );

    expect(typeof ref.current?.present).toBe('function');
    expect(typeof ref.current?.dismiss).toBe('function');
  });

  it('defaults to the medium/large detents (product 12)', async () => {
    await render(
      <Sheet>
        <Text>content</Text>
      </Sheet>,
      { wrapper },
    );

    expect(__getLastModalProps().snapPoints).toEqual(['50%', '90%']);
    // Fixed detents, not content-driven height.
    expect(__getLastModalProps().enableDynamicSizing).toBe(false);
  });

  it('honours caller-provided snap points', async () => {
    await render(
      <Sheet snapPoints={['40%']}>
        <Text>content</Text>
      </Sheet>,
      { wrapper },
    );

    expect(__getLastModalProps().snapPoints).toEqual(['40%']);
  });

  it('dims behind the sheet and paints the sheet surface token', async () => {
    await render(
      <Sheet>
        <Text>content</Text>
      </Sheet>,
      { wrapper },
    );

    const props = __getLastModalProps();
    expect(props.backdropComponent).toBeDefined();
    expect(props.backgroundStyle).toMatchObject({
      backgroundColor: colorSchemes.light.surface.sheet,
    });
  });

  it('forwards onDismiss only when given — never an explicit undefined', async () => {
    const onDismiss = jest.fn();

    await render(
      <Sheet onDismiss={onDismiss}>
        <Text>content</Text>
      </Sheet>,
      { wrapper },
    );
    expect(__getLastModalProps().onDismiss).toBe(onDismiss);

    await render(
      <Sheet>
        <Text>content</Text>
      </Sheet>,
      { wrapper },
    );
    expect('onDismiss' in __getLastModalProps()).toBe(false);
  });
});
