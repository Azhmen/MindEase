import { UI } from '@/constants/ui';
import type { PropsWithChildren } from 'react';
import { usePathname, useRouter, type Href } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { StudentFrame, studentStyles } from '@/components/student-ui';
import { CareIcon } from '@/components/care-icon';
import { AppText } from '@/components/text';
import { CareLayout } from '@/constants/care-layout';
import { Colors } from '@/constants/colors';
import { BorderRadius } from '@/constants/border-radius';

export function CounselorFrame({ children }: PropsWithChildren) {
  return <StudentFrame showNavigation={false} webMaxWidth={430}>{children}<CounselorBottomNav /></StudentFrame>;
}
export function CounselorHeader({ name, backTo }: { name?: string; backTo?: Href }) {
  const router = useRouter();
  const initials = name?.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <View style={CareLayout.header}>
    {backTo ? <Pressable accessibilityRole="button" accessibilityLabel="Back to dashboard" onPress={() => router.replace(backTo)} style={styles.avatar}><CareIcon name="back" size={22} /></Pressable> : <View style={styles.logo}><CareIcon name="leaf" size={26} /></View>}
    <View style={studentStyles.flex}><AppText style={styles.brand}>MindEase</AppText><AppText style={styles.subtitle}>Campus Care</AppText></View>
    <Pressable accessibilityRole="button" accessibilityLabel="Counselor profile" onPress={() => router.push('/counselor/profile')} style={styles.avatar}>{initials ? <AppText style={styles.initials}>{initials}</AppText> : <CareIcon name="profile" size={24} />}</Pressable>
  </View>;
}
export function CounselorScreen({ title, children }: PropsWithChildren<{ title: string }>) {
  return <CounselorFrame><CounselorHeader backTo="/counselor/dashboard" /><KeyboardAvoidingView style={styles.scroll} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"><AppText accessibilityRole="header" style={studentStyles.heading}>{title}</AppText>{children}</ScrollView></KeyboardAvoidingView></CounselorFrame>;
}
export function CounselorBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const tabs = [
    { label: 'Home', icon: 'home', href: '/counselor/dashboard' },
    { label: 'Schedule', icon: 'calendar', href: '/counselor/availability' },
    { label: 'Messages', icon: 'chat', href: '/counselor/chats' },
    { label: 'Profile', icon: 'profile', href: '/counselor/profile' },
  ] as const;
  return <View style={CareLayout.nav}>{tabs.map(tab => {
    const selected = pathname === tab.href || (tab.label === 'Schedule' && pathname.startsWith('/counselor/availability/')) || (tab.label === 'Messages' && pathname.startsWith('/counselor/chat/'));
    return <Pressable key={tab.label} accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{ selected }} onPress={() => router.replace(tab.href)} style={CareLayout.tab}><View style={[CareLayout.tabIcon, selected && styles.selected]}><CareIcon name={tab.icon} size={24} color={selected ? Colors.careGreen : Colors.careMuted} /></View><AppText style={[CareLayout.tabLabel, selected && styles.selectedLabel]}>{tab.label}</AppText></Pressable>;
  })}</View>;
}
const styles = StyleSheet.create({
  logo: { width: 44, height: 44, borderRadius: BorderRadius.medium, backgroundColor: Colors.carePale, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 44, height: 44, borderRadius: BorderRadius.round, backgroundColor: Colors.carePale, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.careBorder },
  initials: { color: Colors.careGreen, fontSize: 14, fontWeight: '600' },
  brand: { color: Colors.careGreen, fontSize: 20, lineHeight: 24, fontWeight: '600' }, subtitle: { color: Colors.careMuted, fontSize: 12, lineHeight: 18 },
  scroll: { flex: 1, minHeight: 0 }, content: { ...UI.page },
  selected: { backgroundColor: Colors.carePale },
  selectedLabel: { color: Colors.careGreen, fontWeight: '600' },
});
