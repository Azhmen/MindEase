import { UI } from '@/constants/ui';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/text';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
  style?: StyleProp<ViewStyle>;
};

function PrimaryButton({ title, onPress, disabled = false, danger = false, style }: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        danger && styles.danger,
        pressed && !disabled && !danger && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <AppText style={[styles.label, danger && { color: Colors.error }]}>{title}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    ...UI.button,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: Spacing.large,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  danger: { backgroundColor: Colors.careAlert },
  pressed: {
    backgroundColor: Colors.primaryPressed,
  },
  disabled: {
    backgroundColor: Colors.disabled,
  },
  label: {
    color: Colors.onPrimary,
    fontWeight: '600',
    fontSize: 15,
  },
});

export { PrimaryButton };
