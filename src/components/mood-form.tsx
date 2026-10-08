import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CareIcon } from '@/components/care-icon';
import { AppTextInput } from '@/components/app-text-input';
import { AppText } from '@/components/text';
import { CareButton, StudentCard, studentStyles } from '@/components/student-ui';
import { MoodOptionCard } from '@/components/mood-option-card';
import { StatusMessage } from '@/components/student-screen';
import { MOODS, type Mood } from '@/services/mood';
import { getAuthErrorMessage } from '@/utils/auth';
import { Colors } from '@/constants/colors';
import { BorderRadius } from '@/constants/border-radius';

const TOUCHPOINTS = ['Midterms & Exams', 'Sleep Quality', 'Social Energy', 'Campus Life'];
export function MoodForm({ initialMood, initialNote = '', onSave, onSaved, richColors = false }: {
  initialMood?: Mood; initialNote?: string; onSave: (mood: Mood, note: string) => Promise<unknown>; onSaved?: () => void; richColors?: boolean;
}) {
  const [mood, setMood] = useState<Mood | undefined>(initialMood);
  const [note, setNote] = useState(initialNote);
  const [touchpoints, setTouchpoints] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  // Preserve older notes of up to 500 characters when editing existing entries.
  const noteLimit = Math.max(200, initialNote.length);
  async function save() {
    if (lock.current) return;
    setError('');
    if (!mood) { setError('Please select a mood.'); return; }
    lock.current = true; setSaving(true);
    try { await onSave(mood, note.trim()); onSaved?.(); }
    catch (err) { setError(getAuthErrorMessage(err)); }
    finally { lock.current = false; setSaving(false); }
  }
  return <View style={styles.form}>
    <View style={styles.choices}>{MOODS.map(choice => <MoodOptionCard key={choice} richColors={richColors} mood={choice} selected={mood === choice} disabled={saving} onPress={() => setMood(choice)} />)}</View>
    <StudentCard style={{ backgroundColor: richColors ? '#D5EADF' : Colors.carePale, boxShadow: 'none', padding: 20 }}>
      <AppText style={studentStyles.section}>What&apos;s shaping your day?</AppText>
      <AppText variant="caption" style={studentStyles.muted}>Optional touchpoints · for reflection only</AppText>
      <View style={styles.touchpoints}>{TOUCHPOINTS.map(point => {
        const selected = touchpoints.includes(point);
        return <Pressable key={point} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} disabled={saving} onPress={() => setTouchpoints(current => selected ? current.filter(item => item !== point) : [...current, point])} style={[styles.chip, selected && styles.selectedChip, richColors && selected && { backgroundColor: Colors.careGreen }]}><CareIcon name={selected ? "check" : "plus"} size={14} color={richColors && selected ? Colors.onPrimary : Colors.careGreen} /><AppText variant="caption" style={[styles.chipText, richColors && selected && { color: Colors.onPrimary }]}>{point}</AppText></Pressable>;
      })}</View>
    </StudentCard>
    <View style={{ gap: 8 }}>
      <AppTextInput label="Want to tell us more?" placeholder="A little space for what's on your mind..." value={note} onChangeText={setNote} multiline maxLength={noteLimit} editable={!saving} style={[styles.note, richColors && { borderColor: '#AEC8BB', color: Colors.careGreen, backgroundColor: '#FFFEFA' }]} />
      <AppText variant="caption" style={styles.counter}>{note.length}/{noteLimit} · optional</AppText>
    </View>
    <StatusMessage message={error} error />
    <CareButton title={saving ? 'Saving...' : initialMood ? 'Save Changes' : 'Save Check-in'} disabled={saving} onPress={save} />
    <AppText variant="caption" style={styles.footer}>Every feeling is welcome. Your check-in is just for you.</AppText>
  </View>;
}
const styles = StyleSheet.create({ form: { gap: 20 }, choices: { flexDirection: 'row', gap: 6 }, touchpoints: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, minHeight: 40, justifyContent: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.round, borderWidth: 0, borderColor: Colors.careBorder }, selectedChip: { backgroundColor: Colors.careInput, borderColor: Colors.careAccent }, chipText: { color: Colors.careGreen, fontSize: 12 }, note: { minHeight: 110, paddingTop: 12, textAlignVertical: 'top', borderColor: Colors.careBorder, backgroundColor: Colors.surface, fontSize: 14 }, counter: { textAlign: 'right', color: Colors.careMuted, fontSize: 12 }, footer: { textAlign: 'center', color: Colors.careMuted, fontSize: 12 } });
