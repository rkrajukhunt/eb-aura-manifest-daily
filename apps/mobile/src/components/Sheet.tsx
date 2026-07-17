import {
  BottomSheetBackdrop,
  BottomSheetModal,
  useBottomSheetSpringConfigs,
  useBottomSheetTimingConfigs,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, type ReactNode } from 'react';

import { EASE, sheetSpring, useMotion } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';

/** 40% dim behind the sheet (product 12 §bottom sheets). */
const BACKDROP_OPACITY = 0.4;

/** Medium/large detents (product 12 §bottom sheets) — every input flow lives here. */
const DETENTS = ['50%', '90%'] as const;

export interface SheetProps {
  children: ReactNode;
  /** Defaults to the medium/large detents; override only with a product reason. */
  snapPoints?: (string | number)[];
  onDismiss?: () => void;
}

/**
 * The design-system bottom sheet (product 12 §bottom sheets, 06 §2): native
 * detents, grabber, 40% dim, spring presentation. Every input flow — Manifest
 * Anything, Refine, guided affirmations — lives in one of these, so the sheet
 * IS the app's "temporary task" language.
 *
 * Present imperatively via the ref (`ref.current?.present()`); requires
 * `BottomSheetModalProvider` at the app root. Callers own the content — pass
 * `BottomSheetView`/`BottomSheetScrollView` as needed.
 */
export const Sheet = forwardRef<BottomSheetModal, SheetProps>(function Sheet(
  { children, snapPoints = [...DETENTS], onDismiss },
  ref,
) {
  const { colors, durations, radii } = useTheme();
  const motion = useMotion();

  // Springs are reserved for sheets — the one place they read as "temporary
  // task" rather than bounce (product 13).
  const spring = useBottomSheetSpringConfigs(sheetSpring);
  // Under Reduce Motion the sheet still has to travel (position can't
  // crossfade), so only the spring's liveliness goes: a plain eased slide.
  const reducedTiming = useBottomSheetTimingConfigs({
    duration: durations.fadeRise,
    easing: EASE,
  });

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={BACKDROP_OPACITY}
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      // Detents are fixed medium/large per product 12 — content-driven sizing
      // would let each sheet pick its own height and break the native feel.
      enableDynamicSizing={false}
      animationConfigs={motion.reduceMotion ? reducedTiming : spring}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: colors.surface.sheet,
        borderTopLeftRadius: radii.sheet,
        borderTopRightRadius: radii.sheet,
      }}
      handleIndicatorStyle={{ backgroundColor: colors.surface.border }}
      {...(onDismiss ? { onDismiss } : {})}
    >
      {children}
    </BottomSheetModal>
  );
});
