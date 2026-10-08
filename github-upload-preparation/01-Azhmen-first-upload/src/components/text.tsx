import { StyleSheet, Text, type TextProps } from 'react-native';

import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';

type TextVariant = keyof typeof Typography.fontSize;

type AppTextProps = TextProps & {
  variant?: TextVariant;
};

function AppText({ variant = 'body', style, ...props }: AppTextProps) {
  return (
    <Text
      {...props}
      style={[
        styles.text,
        {
          fontSize: Typography.fontSize[variant],
          lineHeight: Typography.lineHeight[variant],
        },
        variant === 'heading' && styles.heading,
        variant === 'title' && styles.title,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  text: {
    color: Colors.text,
    fontFamily: Typography.fontFamily.body,
    fontWeight: Typography.fontWeight.regular,
  },
  title: {
    fontWeight: Typography.fontWeight.semibold,
  },
  heading: {
    fontFamily: Typography.fontFamily.editorial,
    letterSpacing: -0.5,
    fontWeight: Typography.fontWeight.bold,
  },
});

export { AppText };
