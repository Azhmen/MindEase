import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, type ViewProps } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

function ScreenContainer({ style, ...props }: ViewProps) {
  return <SafeAreaView style={[styles.container, style]} {...props} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    width: '100%',
    gap: Spacing.medium,
    padding: Spacing.large,
    backgroundColor: Colors.background,
  },
});

export { ScreenContainer };
