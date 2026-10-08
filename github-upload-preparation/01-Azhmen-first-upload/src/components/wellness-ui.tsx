import { BotanicalArt } from '@/components/presentation';
import { Typography } from '@/constants/typography';
import type { ComponentProps, PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/text';
import { CareIcon } from '@/components/care-icon';
import { Colors } from '@/constants/colors';

type Icon = ComponentProps<typeof CareIcon>['name'];
type Tone = 'mint' | 'blue' | 'lavender' | 'amber' | 'danger' | 'neutral';
const tones = { mint: Colors.carePale, blue: Colors.careBadge, lavender: Colors.careLavender, amber: Colors.careAmber, danger: Colors.careAlert, neutral: Colors.careInput };

export function WellnessHeroCard({ eyebrow, title, description, children, icon = 'leaf' }: PropsWithChildren<{ eyebrow: string; title: string; description?: string; icon?: Icon }>) {
  return <View style={styles.hero}><View style={[styles.heroArt, { pointerEvents: 'none' }]}><BotanicalArt size={150} light /></View><View style={styles.heroTop}><AppText style={styles.heroEyebrow}>{eyebrow}</AppText><View style={styles.heroEmblem}><CareIcon name={icon} size={20} color={Colors.onPrimary} /></View></View><AppText style={styles.heroTitle}>{title}</AppText>{description ? <AppText style={styles.heroBody}>{description}</AppText> : null}{children}</View>;
}
export function FeatureBanner({ title, description, icon = 'book', tone = 'mint', children }: PropsWithChildren<{ title: string; description?: string; icon?: Icon; tone?: Tone }>) {
  return <View style={[styles.banner, { backgroundColor: tones[tone] }]}><View style={styles.bannerTop}><View style={styles.emblem}><CareIcon name={icon} size={28} /></View><View style={styles.flex}><AppText style={styles.title}>{title}</AppText>{description ? <AppText style={styles.body}>{description}</AppText> : null}</View></View>{children}</View>;
}
export function QuickActionTile({ title, subtitle, icon, onPress, tone = 'mint' }: { title: string; subtitle?: string; icon: Icon; onPress?: () => void; tone?: Tone }) {
  const content = <><View style={styles.tileTop}><CareIcon name={icon} size={24} />{onPress ? <CareIcon name="arrow" size={16} /> : null}</View><AppText style={styles.title}>{title}</AppText>{subtitle ? <AppText style={styles.body}>{subtitle}</AppText> : null}</>;
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [styles.tile, { backgroundColor: tones[tone] }, pressed && styles.pressed]}>{content}</Pressable> : <View style={[styles.tile, { backgroundColor: tones[tone] }]}>{content}</View>;
}
export function StatTile({ label, value, hint, tone = 'mint' }: { label: string; value: string | number; hint?: string; tone?: Tone }) {
  return <View style={[styles.stat, { backgroundColor: tones[tone] }]}><AppText style={[styles.statValue, typeof value === 'string' && value.length > 3 && { fontSize: 15, lineHeight: 22 }]}>{value}</AppText><AppText style={styles.statLabel}>{label}</AppText>{hint ? <AppText style={styles.meta}>{hint}</AppText> : null}</View>;
}
export function SectionHeader({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle?: string }>) {
  return <View style={styles.section}><View style={styles.flex}><AppText style={styles.sectionTitle}>{title}</AppText>{subtitle ? <AppText style={styles.body}>{subtitle}</AppText> : null}</View>{children}</View>;
}
export function StatusChip({ label, tone }: { label: string; tone?: Tone }) {
  const resolved = tone ?? (/cancel|inactive|unavailable/i.test(label) ? 'neutral' : /virtual/i.test(label) ? 'blue' : 'mint');
  return <View style={[styles.chip, { backgroundColor: tones[resolved] }]}><AppText style={[styles.statLabel, { textTransform: 'capitalize' }, resolved === 'danger' && { color: Colors.error }]}>{label}</AppText></View>;
}
export function IllustratedEmptyState({ title, description, icon = 'leaf', children }: PropsWithChildren<{ title: string; description: string; icon?: Icon }>) {
  return <View style={styles.empty}><View style={styles.emptyIllustration}><View style={styles.emptyIcon}><CareIcon name={icon} size={24} /></View></View><AppText style={styles.sectionTitle}>{title}</AppText><AppText style={[styles.body, styles.center]}>{description}</AppText>{children}</View>;
}
export function SettingsRow({ title, icon, onPress, danger = false }: { title: string; icon: Icon; onPress: () => void; danger?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={styles.settingsRow}><View style={[styles.smallEmblem, { backgroundColor: danger ? Colors.careAlert : Colors.carePale }]}><CareIcon name={icon} size={20} color={danger ? Colors.error : Colors.careGreen} /></View><AppText style={[styles.rowTitle, danger && { color: Colors.error }]}>{title}</AppText><CareIcon name="arrow" size={16} color={Colors.careMuted} /></Pressable>;
}
export const wellnessLayout = StyleSheet.create({ grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, stats: { flexDirection: 'row', gap: 8 } });
const styles = StyleSheet.create({
  hero: { backgroundColor: Colors.careGreen, borderRadius: 24, padding: 22, paddingBottom: 24, gap: 12, overflow: 'hidden' }, heroArt: { position: 'absolute', right: -34, bottom: -25, opacity: 0.35 }, heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, heroEyebrow: { color: Colors.carePale, fontSize: 11, fontWeight: '600', letterSpacing: 1.5, flexShrink: 1 }, heroEmblem: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: Colors.careAccent, alignItems: 'center', justifyContent: 'center' }, heroTitle: { color: Colors.onPrimary, fontFamily: Typography.fontFamily.editorial, fontSize: 28, fontWeight: '700', lineHeight: 36, maxWidth: '90%' }, heroBody: { color: Colors.carePale, fontSize: 14, lineHeight: 22 },
  banner: { borderRadius: 24, padding: 20, gap: 16 }, bannerTop: { flexDirection: 'row', alignItems: 'center', gap: 16 }, emblem: { width: 44, height: 44, borderRadius: 26, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' }, flex: { flex: 1, minWidth: 0 }, title: { color: Colors.careGreen, fontSize: 16, lineHeight: 22, fontWeight: '600' }, body: { color: Colors.careMuted, fontSize: 14, lineHeight: 22 }, tile: { flexGrow: 1, flexBasis: '45%', minWidth: 0, padding: 16, borderRadius: 20, gap: 8, minHeight: 130 }, tileTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }, pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] }, stat: { flex: 1, minWidth: 0, padding: 12, borderRadius: 20, gap: 4 }, statValue: { fontSize: 25, lineHeight: 32, fontWeight: '700', color: Colors.careGreen }, statLabel: { fontSize: 12, lineHeight: 18, fontWeight: '600', color: Colors.careGreen }, meta: { fontSize: 11, lineHeight: 16, color: Colors.careMuted }, section: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8 }, sectionTitle: { fontFamily: Typography.fontFamily.editorial, fontSize: 20, lineHeight: 28, fontWeight: '600', color: Colors.careGreen }, chip: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }, empty: { alignItems: 'center', backgroundColor: Colors.carePale, borderRadius: 24, padding: 24, gap: 12 }, emptyIllustration: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }, emptyIcon: { backgroundColor: Colors.surface, borderRadius: 20, padding: 8 }, center: { textAlign: 'center' }, settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }, smallEmblem: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, rowTitle: { flex: 1, fontSize: 14, color: Colors.careGreen, fontWeight: '500' },
});
