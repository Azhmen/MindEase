import { UI } from '@/constants/ui';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ScrollViewProps, type StyleProp, type TextStyle } from 'react-native';
import { CareIcon } from '@/components/care-icon';
import { AppText } from '@/components/text';
import { StudentFrame, StudentHeader, studentStyles } from '@/components/student-ui';
import { Colors } from '@/constants/colors';
import { useTemporaryFeedback } from '@/hooks/use-temporary-feedback';

export function StudentScreen({ title, children, showHome = true, eyebrow, eyebrowStyle, headingStyle, anonymous = false, backgroundColor, ...props }: ScrollViewProps & { title: string; showHome?: boolean; eyebrow?: string; eyebrowStyle?: StyleProp<TextStyle>; headingStyle?: StyleProp<TextStyle>; anonymous?: boolean; backgroundColor?: string }) {
  return <StudentFrame anonymous={anonymous} backgroundColor={backgroundColor}>
    <StudentHeader anonymous={anonymous} backTo={showHome ? (anonymous ? '/anonymous/home' : '/student/home') : undefined} />
    <KeyboardAvoidingView style={styles.scroll} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} {...props}>
      {eyebrow ? <AppText style={[studentStyles.label, eyebrowStyle]}>{eyebrow}</AppText> : null}
      <AppText accessibilityRole="header" style={[studentStyles.heading, headingStyle]}>{title}</AppText>
      {children}
    </ScrollView></KeyboardAvoidingView>
  </StudentFrame>;
}
export function StatusMessage({ message, error = false, persistent = false }: { message: string; error?: boolean; persistent?: boolean }) {
  return message ? <StatusFeedback key={`${error}:${persistent}:${message}`} message={message} error={error} persistent={persistent || error} /> : null;
}
function StatusFeedback({ message, error, persistent }: { message: string; error: boolean; persistent: boolean }) {
  const visible = useTemporaryFeedback(persistent);
  return visible ? <View style={[styles.status, error && styles.error]}><CareIcon name={error ? 'shield' : 'check'} size={18} color={error ? Colors.error : Colors.careGreen} /><AppText accessibilityLiveRegion="polite" style={[styles.statusText, error && styles.errorText]}>{message}</AppText></View> : null;
}
export function LoadingState() {
  return <View style={styles.status}><ActivityIndicator color={Colors.careGreen} /><AppText style={styles.statusText}>Getting things ready?</AppText></View>;
}
export function formatEntryDate(timestamp: { toDate(): Date } | null) {
  return timestamp ? timestamp.toDate().toLocaleString() : 'Saving timestamp...';
}
const styles = StyleSheet.create({ scroll: { flex: 1, minHeight: 0 }, content: { ...UI.page }, status: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: Colors.carePale, borderWidth: 1, borderColor: Colors.careBorder }, error: { backgroundColor: Colors.careAlert, borderColor: Colors.careAlertBorder }, statusText: { flexShrink: 1, fontSize: 13, lineHeight: 20, color: Colors.careGreen }, errorText: { color: Colors.error } });
