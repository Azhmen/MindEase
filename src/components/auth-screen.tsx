import { CareIcon } from '@/components/care-icon';
import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { AppText } from '@/components/text';
import { Colors } from '@/constants/colors';

export function AuthScreen({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <ScreenContainer style={{ padding: 0 }}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <View style={styles.brand}><CareIcon name="leaf" size={28} /><AppText variant="title" style={{ color: Colors.careGreen, fontWeight: '700' }}>MindEase</AppText></View>
            <AppText variant="caption" style={{ color: Colors.careMuted }}>Campus Care</AppText>
            <AppText variant="heading" style={{ color: Colors.careGreen, fontWeight: '700' }}>{title}</AppText>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

export function AuthError({ message }: { message: string }) {
  return message ? <AppText accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{message}</AppText> : null;
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', gap: 10, alignItems: 'center' }, flex: { flex: 1, minHeight: 0 },
  content: { flexGrow: 1, justifyContent: 'flex-start', padding: 20 },
  form: { width: '100%', maxWidth: 430, alignSelf: 'center', gap: 16, padding: 0 },
  error: { color: Colors.error, backgroundColor: Colors.careAlert, borderWidth: 1, borderColor: Colors.careAlertBorder, borderRadius: 16, padding: 12, fontSize: 13, lineHeight: 20 },
});
