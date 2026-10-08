import { UI } from '@/constants/ui';
import { Typography } from '@/constants/typography';
import type { PropsWithChildren } from 'react';
import { usePathname, useRouter, type Href } from 'expo-router';
import { Platform, Pressable, StyleSheet, View, type ViewProps } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { AppCard } from '@/components/app-card';
import { AppText } from '@/components/text';
import { CareIcon } from '@/components/care-icon';
import { CareLayout } from '@/constants/care-layout';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { BorderRadius } from '@/constants/border-radius';

export function StudentFrame({ children, showNavigation = true, anonymous = false, webMaxWidth = 430, backgroundColor }: PropsWithChildren<{ showNavigation?: boolean; anonymous?: boolean; webMaxWidth?: number; backgroundColor?: string }>) {
  return <ScreenContainer style={styles.outer}><View style={[styles.frame, { minWidth: 0, maxWidth: Platform.OS === 'web' ? webMaxWidth : undefined }, backgroundColor ? { backgroundColor } : undefined]}>{children}{showNavigation ? <StudentBottomNav anonymous={anonymous} /> : null}</View></ScreenContainer>;
}

export function StudentHeader({ backTo, title, anonymous = false }: { backTo?: Href; title?: string; anonymous?: boolean }) {
  const router = useRouter();
  return <View style={CareLayout.header}>
    {backTo ? <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.replace(backTo)} style={styles.iconButton}><CareIcon name="back" size={22} /></Pressable> : <View style={styles.logo}><CareIcon name="leaf" size={26} /></View>}
    <View style={styles.flex}><AppText variant="title" style={styles.brand}>{title ?? 'MindEase'}</AppText><AppText variant="caption" style={styles.muted}>Campus Care</AppText></View>
    {anonymous ? <AppText style={styles.muted}>Guest</AppText> : <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => router.push('/student/profile')} style={styles.iconButton}><CareIcon name="profile" size={24} /></Pressable>}
  </View>;
}

export function StudentBottomNav({ anonymous = false }: { anonymous?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const tabs = anonymous ? [
    { label: 'Home', icon: 'home', href: '/anonymous/home' },
    { label: 'Mood', icon: 'mood', href: '/anonymous/mood' },
    { label: 'Support', icon: 'chat', href: '/anonymous/chat' },
    { label: 'Crisis', icon: 'shield', href: '/anonymous/crisis-support' },
  ] as const : [
    { label: 'Home', icon: 'home', href: '/student/home' },
    { label: 'Mood', icon: 'mood', href: '/student/mood' },
    { label: 'Resources', icon: 'book', href: '/student/resources' },
    { label: 'Profile', icon: 'profile', href: '/student/profile' },
  ] as const;
  return <View style={CareLayout.nav}>{tabs.map(tab => {
    const selected = pathname.startsWith(tab.href) || (tab.label === 'Home' && ['/student/chat', '/student/crisis-support'].includes(pathname));
    return <Pressable key={tab.label} accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{ selected }} onPress={() => router.replace(tab.href)} style={CareLayout.tab}>
      <View style={[CareLayout.tabIcon, selected && styles.selectedTab]}><CareIcon name={tab.icon} size={24} color={selected ? Colors.careGreen : Colors.careMuted} /></View>
      <AppText variant="caption" style={[CareLayout.tabLabel, selected && styles.activeLabel]}>{tab.label}</AppText>
    </Pressable>;
  })}</View>;
}

export function StudentCard(props: ViewProps) { return <AppCard {...props} style={[styles.card, props.style]} />; }

export function CareButton({ title, onPress, disabled = false, secondary = false, danger = false, compact = false }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean; danger?: boolean; compact?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondary, danger && styles.danger, danger && secondary && styles.dangerSecondary, compact && styles.compact, disabled && styles.disabled, pressed && !disabled && styles.pressed]}><AppText style={[styles.buttonText, secondary && styles.secondaryText, danger && secondary && styles.dangerText]}>{title}</AppText></Pressable>;
}

export const studentStyles = StyleSheet.create({
  heading: { fontFamily: Typography.fontFamily.editorial, ...UI.title },
  muted: { color: Colors.careMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.small },
  flex: { flex: 1, minWidth: 0 },
  section: { ...UI.section },
  label: { color: Colors.careMuted, fontSize: 12, letterSpacing: 1, fontWeight: '600' },
});
const styles = StyleSheet.create({
  outer: { padding: 0, gap: 0, minHeight: 0, backgroundColor: Colors.canvas },
  frame: { flex: 1, minHeight: 0, width: '100%', minWidth: 0, maxWidth: Platform.OS === 'web' ? 430 : undefined, alignSelf: 'center', backgroundColor: Colors.careBackground, boxShadow: Platform.OS === 'web' ? '0 12px 64px ' + Colors.careShadow : undefined },
  flex: { flex: 1, minWidth: 0 },
  brand: { color: Colors.careGreen, fontSize: 20, lineHeight: 24, fontWeight: '700' }, muted: { color: Colors.careMuted, fontSize: 12, lineHeight: 18 },
  logo: { width: 44, height: 44, borderRadius: BorderRadius.medium, backgroundColor: Colors.carePale, alignItems: 'center', justifyContent: 'center' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.careInput, borderRadius: BorderRadius.round },
  selectedTab: { backgroundColor: Colors.carePale },
  activeLabel: { color: Colors.careGreen, fontWeight: '600' },
  card: { ...UI.card },
  button: { ...UI.button, minHeight: 50, paddingHorizontal: Spacing.medium, paddingVertical: Spacing.small, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.careGreen, borderRadius: 14, borderWidth: 0, borderColor: Colors.careGreen },
  buttonText: { color: Colors.onPrimary, fontSize: 15, fontWeight: '600', textAlign: 'center' }, secondary: { backgroundColor: Colors.carePale, borderColor: Colors.careBorder }, secondaryText: { color: Colors.careGreen }, danger: { backgroundColor: Colors.error, borderColor: Colors.error }, dangerSecondary: { backgroundColor: Colors.careAlert, borderColor: Colors.careAlertBorder }, dangerText: { color: Colors.error }, compact: { ...UI.smallButton, minHeight: 40, paddingHorizontal: 12, alignSelf: 'flex-start' }, disabled: { opacity: 0.5 }, pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
