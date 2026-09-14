import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import type { ComponentType, RefObject } from 'react';
import type { TextInputProps } from 'react-native';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { EASE, useMotion } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';

export interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /**
   * Fill the field with the page colour instead of card white (v4 §gratitude).
   *
   * For a field that sits INSIDE a white card, where white-on-white leaves
   * nothing to aim at — the composer on Gratitude is the case v4 draws.
   */
  sunken?: boolean;
  /**
   * Gentle inline copy under the field. This is the ONLY feedback channel by
   * design: product 12 bans harsh validation reds — "never harsh validation
   * reds; gentle inline copy instead" — so there is no error colour prop at
   * all. Guidance arrives in the companion's voice, not as an alarm.
   */
  hint?: string;
  /**
   * Hard cap on the field length, passed to the host input. The UI guard — the
   * API layer enforces the same bound so the two cannot drift.
   */
  maxLength?: number;
  multiline?: boolean;
  autoFocus?: boolean;
  /**
   * Passed through for the few fields where the OS keyboard genuinely differs —
   * an email field with a QWERTY keyboard and autocapitalisation is a small
   * cruelty. Kept to these two rather than spreading all of TextInput's props,
   * so the component stays a design-system piece rather than a thin wrapper.
   */
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
  /**
   * Masks the field. Kept as narrow as `keyboardType` above and for the same
   * reason: the sign-in gate needs a password field (founder decision,
   * 2026-07-25) and a bare `TextInput` there would be the one screen in the app
   * not wearing the design system.
   */
  secureTextEntry?: boolean;
  /**
   * Lets the OS keychain offer to save and fill credentials. Without it a
   * password field is a field she has to remember unaided, which is how a
   * password account becomes a locked-out account.
   */
  autoComplete?: 'email' | 'new-password' | 'current-password' | 'off';
  /** Submit behaviour, so the keyboard's action key advances rather than dead-ends. */
  returnKeyType?: 'next' | 'done' | 'go';
  onSubmitEditing?: () => void;
  /**
   * Focus handle for the NEXT field in a form, so `returnKeyType="next"` can
   * actually move focus. Without it "next" only relabels the key and then does
   * nothing when tapped, which is worse than leaving the key alone — she taps
   * it, the keyboard stays put, and the form looks broken.
   */
  fieldRef?: RefObject<TextInput | null>;
  /**
   * Renders `BottomSheetTextInput` instead of a plain one. REQUIRED for any
   * field inside a `Sheet`.
   *
   * `@gorhom/bottom-sheet` tracks focus through its own input to know the sheet
   * must rise; a bare `TextInput` gives it nothing to track, so the keyboard
   * opens over the sheet and the field disappears underneath it. Every input
   * flow in this app lives in a sheet (product 12), so this is the common case,
   * not the exotic one.
   */
  inSheet?: boolean;
  testID?: string;
}

/**
 * Text input (v3 §inputs): borderless on the card surface, body-size text,
 * soft olive focus glow. The glow is an overlay so focus never shifts
 * layout — the field breathes awake rather than snapping a border on.
 *
 * EVERY field in the app renders through here — there is no bare `TextInput`
 * in `features/`. That is what makes the vertical-centring fix below a
 * one-place fix rather than fifteen, and it is worth keeping true: a field
 * added outside this component silently opts out of the height, the centring
 * and the focus glow at once.
 */
export function Input({
  value,
  onChangeText,
  placeholder,
  hint,
  maxLength,
  multiline = false,
  autoFocus = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  secureTextEntry = false,
  autoComplete,
  returnKeyType,
  onSubmitEditing,
  fieldRef,
  inSheet = false,
  testID,
  sunken = false,
}: InputProps) {
  const { colors, durations, layout, radii, shadows, spacing, typography } = useTheme();
  const motion = useMotion();
  const glow = useSharedValue(0);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  const animateGlow = (focused: boolean) => {
    const target = focused ? 1 : 0;
    // Same 150ms tempo as the chip acknowledgment — one response language
    // app-wide. Under Reduce Motion the glow simply appears.
    glow.value = motion.reduceMotion
      ? target
      : withTiming(target, {
          duration: Math.round(durations.chipSelect * motion.scale),
          easing: EASE,
        });
  };

  /**
   * Same props either way — only the host component differs, so the design
   * system stays one field rather than two that can drift.
   *
   * Annotated rather than inferred because the two branches disagree about
   * their ref type: `BottomSheetTextInput` is typed against the copy of
   * `TextInput` that react-native-gesture-handler re-exports, so the inferred
   * union has a ref no real ref satisfies. Both accept `TextInputProps` and
   * both forward to a real `TextInput` at runtime, so naming that contract here
   * is the accurate description, not a loophole.
   */
  const Field = (inSheet ? BottomSheetTextInput : TextInput) as unknown as ComponentType<
    TextInputProps & { ref?: RefObject<TextInput | null> }
  >;

  /**
   * `typography.body` is 15/24, and that 24pt leading is the reason text used
   * to sit low in every single-line field in the app: iOS lays a single-line
   * `TextInput`'s glyphs against the BOTTOM of the line box rather than its
   * middle, so a 24pt box around 15pt text pushes the glyphs down by the
   * difference. It reads as "the text isn't centred" and no amount of padding
   * fixes it, because the offset is inside the line box.
   *
   * So the leading is stripped here and handed back only to multiline below.
   * Splitting it this way rather than dropping `lineHeight` from the token
   * keeps paragraphs readable: leading is wrong for one line and load-bearing
   * for several.
   */
  const { lineHeight, ...bodyNoLeading } = typography.body;

  /**
   * The two fields are different objects, not one with tweaks — a single-line
   * field is a control and a multiline field is a page to write on, and they
   * disagree about every metric below.
   */
  const metrics = multiline
    ? {
        // Opens at three lines. A composer that opens one line tall reads as a
        // single-line field, and she answers "describe yourself" in four words.
        minHeight: layout.fieldHeightMultiline,
        padding: spacing.md,
        // Handed back: this is the case the leading was designed for.
        lineHeight,
        // Text starts at the top and grows down; centring a half-written
        // paragraph in its box would make it drift while she types.
        textAlignVertical: 'top' as const,
      }
    : {
        // A FIXED height with NO vertical padding is the fix. It leaves the
        // platform one unambiguous box to centre in; a padding-derived height
        // is whatever the font's metrics happen to make it, which is how these
        // fields drifted off-centre and off each other in the first place.
        height: layout.fieldHeight,
        paddingHorizontal: spacing.md,
        paddingVertical: 0,
        // Android honours this; iOS centres a single-line field natively.
        textAlignVertical: 'center' as const,
      };

  return (
    <View>
      <View>
        <Field
          testID={testID}
          {...(fieldRef !== undefined && { ref: fieldRef })}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          autoFocus={autoFocus}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          {...(maxLength !== undefined && { maxLength })}
          {...(autoComplete !== undefined && { autoComplete })}
          {...(returnKeyType !== undefined && { returnKeyType })}
          {...(onSubmitEditing !== undefined && { onSubmitEditing })}
          onFocus={() => animateGlow(true)}
          onBlur={() => animateGlow(false)}
          placeholderTextColor={colors.text.secondary}
          {...(placeholder !== undefined && { placeholder })}
          style={[
            bodyNoLeading,
            {
              // v4 §gratitude sinks the field into the page colour so it reads
              // as somewhere to write rather than another white card.
              backgroundColor: sunken ? colors.bg.base : colors.surface.card,
              borderRadius: radii.field,
              color: colors.text.primary,
              // Android's counterpart to the leading problem above: it reserves
              // extra room above and below the glyphs for ascenders the font
              // may never use, which offsets the text inside the field the same
              // way. Harmless on iOS, which ignores it.
              includeFontPadding: false,
            },
            // Last, so the per-mode metrics win over anything above them.
            metrics,
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              ...shadows.focusGlow,
              borderRadius: radii.field,
              borderWidth: 1,
              borderColor: colors.accent.olive,
              shadowColor: colors.accent.olive,
            },
            glowStyle,
          ]}
        />
      </View>
      {hint !== undefined && (
        <Text
          style={[typography.bodySmall, { color: colors.text.secondary, marginTop: spacing.xs }]}
        >
          {hint}
        </Text>
      )}
    </View>
  );
}
