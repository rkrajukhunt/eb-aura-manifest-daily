import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { Input, PillButton, TextButton } from '@/components';
import { profileCopy } from '@/copy/profile';
import { useTheme } from '@/theme/ThemeProvider';

export interface EditFieldSheetProps {
  open: boolean;
  title: string;
  initialValue: string;
  multiline?: boolean;
  onSave: (value: string) => void;
  onClose: () => void;
}

/**
 * The edit sheet for profile fields (product 11: sheets for input). On save it
 * shows the memory contract — "I'll write differently from now on" — because an
 * edit that silently vanishes reads as not being heard (product 10 §44).
 *
 * Plain Modal for the same reason as the edit-guard: a simple single-input
 * sheet doesn't need detent machinery, and it keeps this testable everywhere.
 */
export function EditFieldSheet({
  open,
  title,
  initialValue,
  multiline = false,
  onSave,
  onClose,
}: EditFieldSheetProps) {
  const { colors, radii, spacing, typography } = useTheme();
  const [value, setValue] = useState(initialValue);
  const [saved, setSaved] = useState(false);

  // Re-opening for a different field must not show the previous field's text.
  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setSaved(false);
    }
  }, [open, initialValue]);

  const save = () => {
    onSave(value);
    setSaved(true);
    // Let the contract line land before the sheet leaves.
    setTimeout(onClose, 1200);
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityLabel={profileCopy.edit.cancel}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: colors.surface.scrim, justifyContent: 'flex-end' }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.surface.sheet,
            borderTopLeftRadius: radii.sheet,
            borderTopRightRadius: radii.sheet,
            padding: spacing.lg,
            gap: spacing.md,
          }}
        >
          <Text style={[typography.title, { color: colors.text.primary }]}>{title}</Text>

          {saved ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[typography.body, { color: colors.text.secondary }]}
            >
              {profileCopy.edit.savedNote}
            </Text>
          ) : (
            <View style={{ gap: spacing.md }}>
              <Input value={value} onChangeText={setValue} multiline={multiline} autoFocus />
              <PillButton title={profileCopy.edit.save} onPress={save} />
              <TextButton title={profileCopy.edit.cancel} onPress={onClose} />
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
