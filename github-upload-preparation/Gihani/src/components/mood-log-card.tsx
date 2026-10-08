import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/text';
import { CareIcon } from '@/components/care-icon';
import { MoodFace } from '@/components/mood-option-card';
import { StudentCard } from '@/components/student-ui';
import { MoodReflectionPanel } from '@/components/mood-reflection-panel';
import type { MoodEntry } from '@/services/mood';
import type { MoodReflection } from '@/services/mood-reflections';
import { Colors } from '@/constants/colors';

export function MoodLogCard({ entry, reflection, reflectionDisabled, onReflectionChanged }: { entry: MoodEntry; reflection?: MoodReflection; reflectionDisabled: boolean; onReflectionChanged: (text: string | null) => void }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const date = entry.createdAt?.toDate();
  const dateLabel = date?.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) ?? 'Saving timestamp…';
  const timeLabel = date?.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  function manage(action: 'edit' | 'delete') {
    setMenuOpen(false);
    router.push({ pathname: '/student/mood/edit/[id]', params: { id: entry.id, action } });
  }
  return <StudentCard style={styles.card}>
    <View style={styles.header}>
      <View style={styles.mood}><MoodFace mood={entry.mood} size={26} /><AppText style={styles.moodLabel}>{entry.mood}</AppText></View>
      <View style={styles.date}><AppText style={styles.secondary}>{dateLabel}</AppText>{timeLabel ? <AppText style={styles.secondary}>{timeLabel}</AppText> : null}</View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Check-in actions for ${entry.mood}, ${dateLabel}`} accessibilityState={{ expanded: menuOpen }} onPress={() => setMenuOpen(value => !value)} style={styles.more}><CareIcon name="more" size={22} /></Pressable>
    </View>
    {menuOpen ? <View style={styles.menu}>
      <Pressable accessibilityRole="button" accessibilityLabel="Edit check-in" onPress={() => manage('edit')} style={styles.menuAction}><AppText style={styles.actionText}>Edit check-in</AppText></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Delete check-in" onPress={() => manage('delete')} style={styles.menuAction}><AppText style={[styles.actionText, styles.danger]}>Delete check-in</AppText></Pressable>
    </View> : null}
    {entry.note ? <AppText style={styles.note}>{entry.note}</AppText> : null}
    <MoodReflectionPanel moodEntryId={entry.id} reflection={reflection} disabled={reflectionDisabled} onChanged={onReflectionChanged} />
  </StudentCard>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: Colors.onPrimary, borderRadius: 20, padding: 16, gap: 12, minWidth: 0, boxShadow: '0 3px 12px ' + Colors.careShadow },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 }, mood: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: 0 }, moodLabel: { color: Colors.careGreen, fontSize: 14, fontWeight: '600', flexShrink: 1 }, date: { flex: 1, minWidth: 0, alignItems: 'flex-end' }, secondary: { color: Colors.careMuted, fontSize: 10, lineHeight: 16, textAlign: 'right' }, more: { width: 36, height: 38, justifyContent: 'center', alignItems: 'center' },
  note: { color: Colors.careGreen, fontSize: 13, lineHeight: 21 }, menu: { alignSelf: 'flex-end', backgroundColor: Colors.surface, padding: 4, borderRadius: 12, borderWidth: 1, borderColor: Colors.careBorder }, menuAction: { minHeight: 38, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }, actionText: { fontSize: 12, fontWeight: '500', color: Colors.careGreen }, danger: { color: Colors.error },
});
