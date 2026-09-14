import { type StyleProp, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export interface SegmentedProgressBarProps {
  /** 0..1 — progress ratio. Clamped to [0, 1]. */
  progress: number;
  /** Number of pill segments. Default: 5. */
  segments?: number | undefined;
  /** Pill height in points. Default: 6. */
  height?: number | undefined;
  /** Gap between segments in points. Default: 6. */
  gap?: number | undefined;
  /**
   * How segments fill:
   * - 'smooth': current active segment fills proportionally with progress.
   * - 'discrete': each segment is either fully filled or empty based on milestone reached.
   * Default: 'smooth'.
   */
  fillMode?: 'smooth' | 'discrete' | undefined;
  /** Active pill color. Defaults to colors.accent.emberDeep. */
  activeColor?: string | undefined;
  /** Inactive pill track color. Defaults to colors.surface.border. */
  inactiveColor?: string | undefined;
  /** Accessible name for screen readers, e.g. "Progress". */
  label?: string | undefined;
  style?: StyleProp<ViewStyle> | undefined;
  testID?: string | undefined;
}

/** Default segmented progress bar dimensions. */
const DEFAULT_SEGMENTS = 5;
const DEFAULT_HEIGHT = 6;
const DEFAULT_GAP = 6;

/**
 * A segmented capsule-pill progress bar.
 *
 * Displays a series of rounded capsule pills separated by gaps.
 * Each segment fills as progress advances, giving an elevated, modern
 * step-progress aesthetic.
 */
export function SegmentedProgressBar({
  progress,
  segments = DEFAULT_SEGMENTS,
  height = DEFAULT_HEIGHT,
  gap = DEFAULT_GAP,
  fillMode = 'smooth',
  activeColor,
  inactiveColor,
  label,
  style,
  testID,
}: SegmentedProgressBarProps) {
  const { colors, radii } = useTheme();
  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const count = Math.max(1, Math.floor(segments));
  const filledCount = Math.round(clamped * count);

  // Announce exactly what is drawn. Smooth mode fills proportionally, so it
  // announces the true ratio; discrete mode only ever shows whole segments, so
  // its percentage derives from lit segments — a reader never hears a number
  // the bar does not show.
  const announced =
    fillMode === 'discrete' ? Math.round((filledCount / count) * 100) : Math.round(clamped * 100);

  const resolvedActive = activeColor ?? colors.accent.emberDeep;
  const resolvedInactive = inactiveColor ?? colors.surface.border;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: announced }}
      testID={testID}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap,
        },
        style,
      ]}
    >
      {Array.from({ length: count }, (_, i) => {
        let fillFraction = 0;
        if (fillMode === 'discrete') {
          // Discrete: a segment is full once its milestone is reached. Exactly
          // `filledCount` are lit — the same figure the value now announces.
          fillFraction = i < filledCount ? 1 : 0;
        } else {
          // Smooth mode: proportional fill within the active segment.
          const segStart = i / count;
          const segEnd = (i + 1) / count;
          if (clamped >= segEnd) {
            fillFraction = 1;
          } else if (clamped <= segStart) {
            fillFraction = 0;
          } else {
            fillFraction = (clamped - segStart) / (segEnd - segStart);
          }
        }

        const pct = Math.round(Math.min(1, Math.max(0, fillFraction)) * 1000) / 10;

        return (
          <View
            key={i}
            testID={testID ? `${testID}-segment-${i}` : undefined}
            style={{
              flex: 1,
              height,
              borderRadius: radii.pill,
              backgroundColor: resolvedInactive,
              overflow: 'hidden',
            }}
          >
            {pct > 0 && (
              <View
                testID={testID ? `${testID}-segment-fill-${i}` : undefined}
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  borderRadius: radii.pill,
                  backgroundColor: resolvedActive,
                }}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}
