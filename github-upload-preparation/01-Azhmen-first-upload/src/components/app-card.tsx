import { UI } from '@/constants/ui';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { BorderRadius } from '@/constants/border-radius';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

function AppCard({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    ...UI.card,
    gap: Spacing.compact,
    padding: Spacing.medium,
    borderRadius: BorderRadius.large,
    backgroundColor: Colors.surface,
    borderWidth: 0,
    boxShadow: UI.card.boxShadow,
  },
});

export { AppCard };
