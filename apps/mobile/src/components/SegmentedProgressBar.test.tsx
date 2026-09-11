import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { palette } from '@/theme/palette';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { SegmentedProgressBar } from './SegmentedProgressBar';

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider forceScheme="light">{children}</ThemeProvider>;
}

describe('SegmentedProgressBar', () => {
  it('renders default 5 segments with progressbar accessibility role and value', async () => {
    await render(<SegmentedProgressBar progress={0.6} testID="test-bar" />, { wrapper });

    const bar = screen.getByTestId('test-bar');
    expect(bar).toBeTruthy();
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 60 });

    // 5 segments
    expect(screen.getByTestId('test-bar-segment-0')).toBeTruthy();
    expect(screen.getByTestId('test-bar-segment-1')).toBeTruthy();
    expect(screen.getByTestId('test-bar-segment-2')).toBeTruthy();
    expect(screen.getByTestId('test-bar-segment-3')).toBeTruthy();
    expect(screen.getByTestId('test-bar-segment-4')).toBeTruthy();
  });

  it('renders custom segment count', async () => {
    await render(<SegmentedProgressBar progress={0.5} segments={3} testID="custom-bar" />, {
      wrapper,
    });

    expect(screen.getByTestId('custom-bar-segment-0')).toBeTruthy();
    expect(screen.getByTestId('custom-bar-segment-1')).toBeTruthy();
    expect(screen.getByTestId('custom-bar-segment-2')).toBeTruthy();
    expect(screen.queryByTestId('custom-bar-segment-3')).toBeNull();
  });

  it('fills segments proportionally in smooth mode', async () => {
    // 64% with 5 segments: segments 0, 1, 2 full (100%), segment 3 at 20%, segment 4 at 0%
    await render(
      <SegmentedProgressBar progress={0.64} segments={5} fillMode="smooth" testID="smooth-bar" />,
      { wrapper },
    );

    const fill0 = screen.getByTestId('smooth-bar-segment-fill-0');
    expect(fill0.props.style.width).toBe('100%');

    const fill1 = screen.getByTestId('smooth-bar-segment-fill-1');
    expect(fill1.props.style.width).toBe('100%');

    const fill2 = screen.getByTestId('smooth-bar-segment-fill-2');
    expect(fill2.props.style.width).toBe('100%');

    const fill3 = screen.getByTestId('smooth-bar-segment-fill-3');
    expect(fill3.props.style.width).toBe('20%');

    // Segment 4 has 0% fill so no fill child is rendered
    expect(screen.queryByTestId('smooth-bar-segment-fill-4')).toBeNull();
  });

  it('fills segments discretely in discrete mode', async () => {
    // 64% with 5 segments: exactly 3 segments filled, 2 empty
    await render(
      <SegmentedProgressBar
        progress={0.64}
        segments={5}
        fillMode="discrete"
        testID="discrete-bar"
      />,
      { wrapper },
    );

    expect(screen.getByTestId('discrete-bar-segment-fill-0').props.style.width).toBe('100%');
    expect(screen.getByTestId('discrete-bar-segment-fill-1').props.style.width).toBe('100%');
    expect(screen.getByTestId('discrete-bar-segment-fill-2').props.style.width).toBe('100%');
    expect(screen.queryByTestId('discrete-bar-segment-fill-3')).toBeNull();
    expect(screen.queryByTestId('discrete-bar-segment-fill-4')).toBeNull();
  });

  it('clamps progress to [0, 1]', async () => {
    await render(<SegmentedProgressBar progress={1.5} segments={3} testID="clamped-high" />, {
      wrapper,
    });
    const barHigh = screen.getByTestId('clamped-high');
    expect(barHigh.props.accessibilityValue.now).toBe(100);

    await render(<SegmentedProgressBar progress={-0.5} segments={3} testID="clamped-low" />, {
      wrapper,
    });
    const barLow = screen.getByTestId('clamped-low');
    expect(barLow.props.accessibilityValue.now).toBe(0);
  });

  it('applies custom active and inactive colors', async () => {
    await render(
      <SegmentedProgressBar
        progress={1}
        segments={2}
        activeColor={palette.ember}
        inactiveColor={palette.oliveSoft}
        testID="custom-color"
      />,
      { wrapper },
    );

    const seg0 = screen.getByTestId('custom-color-segment-0');
    expect(seg0.props.style.backgroundColor).toBe(palette.oliveSoft);

    const fill0 = screen.getByTestId('custom-color-segment-fill-0');
    expect(fill0.props.style.backgroundColor).toBe(palette.ember);
  });
});
