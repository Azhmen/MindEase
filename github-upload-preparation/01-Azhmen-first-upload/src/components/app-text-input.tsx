import { UI } from '@/constants/ui';
import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from '@/components/text';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';

type AppTextInputProps = TextInputProps & {
  label?: string;
};

function AppTextInput({ label, style, ...props }: AppTextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.container}>
      {label ? <AppText variant="caption" style={styles.label}>{label}</AppText> : null}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={Colors.placeholder}
        selectionColor={Colors.careGreen}
        style={[styles.input, style, focused && styles.focused]}
        {...props}
        onFocus={event => { setFocused(true); props.onFocus?.(event); }}
        onBlur={event => { setFocused(false); props.onBlur?.(event); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.small,
  },
  input: {
    ...UI.input,
    minHeight: 52,
    paddingHorizontal: Spacing.medium,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: Typography.fontFamily.body,
    borderWidth: 1,
    borderColor: Colors.careBorder,
    borderRadius: 14,
    backgroundColor: Colors.careInput,
    color: Colors.text,
  },
  label: { color: Colors.careGreen, fontWeight: '500' },
  focused: { borderColor: Colors.careGreen, backgroundColor: Colors.surface },
});

export { AppTextInput };
