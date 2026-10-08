import { Typography } from '@/constants/typography';
import { useCallback, useRef, useState, type PropsWithChildren, type ReactNode } from 'react';
import { useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { AppText } from '@/components/text';
import { CareIcon } from '@/components/care-icon';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { BorderRadius } from '@/constants/border-radius';
import type { UserRole } from '@/services/user-profile';

const TOP_OFFSET = { x: 0, y: 0 };

export function CareLoginLayout({ children }: PropsWithChildren) {
  const scrollRef = useRef<ScrollView>(null);

  // Reset retained scroll positions whenever Login opens, after the viewport lays out.
  useFocusEffect(useCallback(() => {
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ ...TOP_OFFSET, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, []));

  return (
    <ScreenContainer style={styles.screen}>
      <KeyboardAvoidingView style={styles.viewport} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={styles.viewport}
          contentContainerStyle={styles.scrollContent}
          contentOffset={TOP_OFFSET}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.heading}><View style={styles.art}><CareIcon name="leaf" size={28} /></View>
              <AppText variant="title" style={styles.title}>Welcome Back</AppText>
              <AppText variant="caption" style={styles.subtitle}>Sign in through your student portal or connect{ '\n' }directly to anonymous campus care.</AppText>
            </View>
            {children}
            <View style={styles.quote}>
              <Image source={{ uri: gardenArt }} style={styles.thumbnail} />
              <View style={styles.flex}>
                <AppText style={styles.quoteTitle}>{'“Take a slow breath.”'}</AppText>
                <AppText variant="caption" style={styles.quoteCaption}>Your academic peace comes first today.</AppText>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

export function CareDivider({ text }: { text: string }) {
  return <View style={styles.divider}><View style={styles.line} /><AppText variant="caption" style={styles.dividerText}>{text}</AppText><View style={styles.line} /></View>;
}

export function RoleSelector({ role, onChange, disabled }: { role: UserRole; onChange: (role: UserRole) => void; disabled: boolean }) {
  return <View style={styles.roleSection}><AppText variant="caption">I am</AppText><View style={styles.segments}>{(['student', 'counselor'] as const).map(option => (
    <Pressable key={option} accessibilityRole="radio" accessibilityState={{ checked: option === role, disabled }} disabled={disabled} onPress={() => onChange(option)} style={[styles.segment, option === role && styles.selected]}>
      <AppText variant="caption" style={styles.segmentText}>{option === 'student' ? 'Student' : 'Counselor'}</AppText>
    </Pressable>
  ))}</View></View>;
}

export function CareField({ label, icon, action, trailing, ...props }: TextInputProps & { label: string; icon: 'id' | 'lock'; action?: ReactNode; trailing?: ReactNode }) {
  const [focused, setFocused] = useState(false);
  return <View style={styles.field}><View style={styles.labelRow}><AppText variant="caption" style={styles.label}>{label}</AppText>{action}</View><View style={[styles.inputRow, focused && styles.focused]}><CareIcon name={icon} color={Colors.careMuted} /><TextInput {...props} accessibilityLabel={label} placeholderTextColor={Colors.careMuted} selectionColor={Colors.careGreen} style={styles.input} onFocus={event => { setFocused(true); props.onFocus?.(event); }} onBlur={event => { setFocused(false); props.onBlur?.(event); }} />{trailing}</View></View>;
}

// Small vector garden illustration approximates the reference thumbnail; replace with the Figma asset when available.
const gardenArt = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="8" fill="#DDE3CF"/><path d="M0 56 64 36v28H0" fill="#A9B79B"/><path d="M23 64V28m18 36V17M9 50V15M56 47V4" stroke="#667F65" stroke-width="2"/><g fill="#82997A"><ellipse cx="15" cy="17" rx="10" ry="5" transform="rotate(-35 15 17)"/><ellipse cx="33" cy="28" rx="12" ry="6" transform="rotate(-30 33 28)"/><ellipse cx="46" cy="16" rx="10" ry="5" transform="rotate(-40 46 16)"/><ellipse cx="49" cy="39" rx="13" ry="6" transform="rotate(25 49 39)"/></g><g fill="#F2ECDD"><circle cx="21" cy="12" r="4"/><circle cx="37" cy="41" r="5"/><circle cx="12" cy="39" r="4"/><circle cx="54" cy="24" r="4"/></g></svg>');

export const careLoginStyles = StyleSheet.create({
  card: { padding: 20, gap: 16, borderRadius: 22, backgroundColor: Colors.surface, boxShadow: '0 3px 12px ' + Colors.careShadow },
  pill: { minHeight: 52, paddingHorizontal: Spacing.medium, backgroundColor: Colors.carePale, borderRadius: 14, flexDirection: 'row', gap: Spacing.small, alignItems: 'center', justifyContent: 'center' },
  pillText: { color: Colors.careGreen, fontWeight: '600' },
  signIn: { backgroundColor: Colors.careGreen, borderRadius: BorderRadius.round, flexDirection: 'row', minHeight: 52, gap: Spacing.small, alignItems: 'center', justifyContent: 'center' },
  signInText: { color: Colors.onPrimary, fontWeight: '600' },
  disabled: { opacity: 0.6 },
  smallLink: { color: Colors.careGreen, fontSize: 12 },
  touch: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.xsmall },
  linkTouch: { minHeight: 44, justifyContent: 'center' },
  remember: { flexDirection: 'row', gap: Spacing.small, alignItems: 'center', minHeight: 44 },
  checkbox: { width: 18, height: 18, borderRadius: Spacing.xsmall, borderWidth: 1, borderColor: Colors.careGreen, backgroundColor: Colors.surface },
  muted: { color: Colors.careMuted },
  anonymous: { gap: Spacing.xsmall, alignItems: 'center' },
  notice: { color: Colors.careMuted, fontSize: 12, lineHeight: 16, textAlign: 'center', paddingHorizontal: Spacing.small },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // Web flex children must be allowed to shrink to the available viewport height.
  // The ScrollView owns overflow; its contents retain their natural height.
  viewport: { flex: 1, minHeight: 0 },
  screen: { backgroundColor: Colors.careBackground, padding: 0, minHeight: 0 },
  scrollContent: {
    flexGrow: 0,
    flexShrink: 0,
    justifyContent: 'flex-start',
    paddingHorizontal: Spacing.medium,
    paddingTop: Spacing.xlarge,
    // ScreenContainer already applies safe-area insets; leave extra room after the quote.
    paddingBottom: Spacing.xlarge + Spacing.medium,
  },
  content: { width: '100%', maxWidth: 430, alignSelf: 'center', flexShrink: 0, gap: 24 },
  art: { width: 48, height: 48, borderRadius: 16, backgroundColor: Colors.carePale, alignItems: 'center', justifyContent: 'center' }, heading: { alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  title: { color: Colors.careGreen, fontFamily: Typography.fontFamily.editorial, fontSize: 30, lineHeight: 38, fontWeight: '700' },
  subtitle: { textAlign: 'left', color: Colors.careMuted, fontSize: 14, lineHeight: 22 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.small },
  line: { flex: 1, height: 1, backgroundColor: Colors.careBorder },
  dividerText: { fontSize: 12, color: Colors.careMuted },
  roleSection: { gap: Spacing.xsmall },
  segments: { flexDirection: 'row', gap: Spacing.small, backgroundColor: Colors.careInput, padding: Spacing.xsmall, borderRadius: BorderRadius.round },
  segment: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.round },
  selected: { backgroundColor: Colors.surface, boxShadow: '0 2px 8px ' + Colors.careShadow },
  segmentText: { color: Colors.careGreen, fontWeight: '600' },
  field: { gap: Spacing.xsmall },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 24 },
  label: { fontWeight: '600' },
  inputRow: { flexDirection: 'row', gap: Spacing.small, alignItems: 'center', paddingHorizontal: Spacing.small, backgroundColor: Colors.careInput, borderRadius: BorderRadius.medium, borderWidth: 1, borderColor: Colors.careBorder, minHeight: 54 },
  input: { fontFamily: Typography.fontFamily.body, flex: 1, minWidth: 0, minHeight: 52, fontSize: 15, color: Colors.text },
  focused: { borderColor: Colors.careGreen, backgroundColor: Colors.carePale },
  quote: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, backgroundColor: Colors.carePale },
  thumbnail: { width: 52, height: 52, borderRadius: BorderRadius.small },
  quoteTitle: { color: Colors.careGreen, fontSize: 15 },
  quoteCaption: { color: Colors.careMuted, fontSize: 12 },
});
