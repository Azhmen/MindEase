import type { PropsWithChildren } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/text';
import { Colors } from '@/constants/colors';

// Decorative artwork only: no new product copy or data.
export function BotanicalArt({ size = 130, light = false }: { size?: number; light?: boolean }) {
  const stroke = light ? Colors.carePale : Colors.careGreen;
  const leaf = light ? Colors.careAccent : Colors.careAccent;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><circle cx="80" cy="80" r="70" fill="${Colors.careAccent}" opacity=".13"/><circle cx="80" cy="80" r="57" fill="none" stroke="${stroke}" opacity=".15"/><path d="M80 139c0-34 4-57 16-91M81 116C53 108 38 94 35 69c27 0 46 16 46 47M87 93c27-6 43-23 46-45-25 0-42 19-46 45M92 69C72 56 67 37 72 20c21 9 29 29 20 49" fill="${leaf}" opacity=".8"/><path d="M80 136c0-37 6-65 16-88M80 113 48 81M88 91l30-30M93 66 77 33" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/><circle cx="32" cy="116" r="4" fill="${stroke}" opacity=".25"/><circle cx="133" cy="113" r="7" fill="${leaf}" opacity=".3"/></svg>`;
  return <Image source={{ uri: 'data:image/svg+xml;utf8,' + encodeURIComponent(svg) }} style={{ width: size, height: size }} accessibilityElementsHidden />;
}
export function FormPanel({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: 'neutral' | 'mint' | 'lavender' }>) {
  return <View style={[styles.form, tone === 'mint' && styles.mint, tone === 'lavender' && styles.lavender]}>{children}</View>;
}
export function StepRail({ step, total = 3 }: { step: number; total?: number }) {
  return <View style={{ gap: 8 }}><AppText variant="caption" style={{ color: Colors.careMuted }}>Step {step} of {total}</AppText><View accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: total, now: step }} style={styles.steps}>{Array.from({ length: total }, (_, index) => <View key={index} style={[styles.step, index < step && styles.done]} />)}</View></View>;
}
export const presentation = StyleSheet.create({
  timeline: { gap: 12 },
  listPanel: { backgroundColor: Colors.surface, padding: 20, borderRadius: 24, gap: 16 },
  inset: { paddingVertical: 12, gap: 8, borderTopWidth: 1, borderColor: Colors.careBorder },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  formRow: { flexDirection: 'row', gap: 12 },
  formColumn: { flex: 1, minWidth: 0 },
  quiet: { backgroundColor: Colors.careInput, boxShadow: 'none' },
});
const styles = StyleSheet.create({ form: { padding: 18, backgroundColor: Colors.surface, borderRadius: 22, gap: 16 }, mint: { backgroundColor: Colors.carePale }, lavender: { backgroundColor: Colors.careLavender }, steps: { flexDirection: 'row', gap: 8, paddingVertical: 4 }, step: { flex: 1, height: 4, backgroundColor: Colors.careBorder, borderRadius: 4 }, done: { backgroundColor: Colors.careGreen } });
