import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/text';
import { MoodFace } from '@/components/mood-option-card';
import { CareButton, StudentCard, studentStyles } from '@/components/student-ui';
import { LoadingState, StudentScreen, StatusMessage, formatEntryDate } from '@/components/student-screen';
import { deleteMoodEntry, getMoodEntriesForUser, type MoodEntry } from '@/services/anonymous-mood';
import { getAuthErrorMessage } from '@/utils/auth';

// Anonymous mood CRUD is separate from authenticated mood_entries and reflections.

export default function MoodHistoryRoute() {
  const router = useRouter();
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const lock = useRef(false);
  useFocusEffect(useCallback(() => {
    void attempt;
    let active = true;
    setLoading(true); setError(''); setEntries([]); setConfirmId(null);
    getMoodEntriesForUser().then(data => { if (active) setEntries(data); }).catch(err => { if (active) setError(getAuthErrorMessage(err)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]));
  async function remove(id: string) {
    if (lock.current) return;
    lock.current = true; setDeleting(true); setError(''); setNotice('');
    try { await deleteMoodEntry(id); setEntries(current => current.filter(entry => entry.id !== id)); setConfirmId(null); setNotice('Mood entry deleted.'); }
    catch (err) { setError(getAuthErrorMessage(err)); }
    finally { lock.current = false; setDeleting(false); }
  }
  return <StudentScreen anonymous title="Mood History">
    <AppText style={studentStyles.muted}>A gentle look back at how you have been feeling.</AppText>
    <CareButton title="Check In Again" disabled={deleting} onPress={() => router.push('/anonymous/mood')} />
    {loading ? <LoadingState /> : null}<StatusMessage message={error} error /><StatusMessage message={notice} />
    {error && !entries.length ? <CareButton title="Try again" secondary onPress={() => setAttempt(value => value + 1)} /> : null}
    {!loading && !error && !entries.length ? <StudentCard><AppText style={studentStyles.section}>Your journey starts here</AppText><AppText style={studentStyles.muted}>No mood entries yet. Start with a gentle check-in.</AppText></StudentCard> : null}
    {entries.map(entry => <StudentCard key={entry.id} style={{ padding: 18, gap: 12, borderRadius: 20 }}>
      <View style={studentStyles.row}><MoodFace mood={entry.mood} size={28} /><View style={studentStyles.flex}><AppText style={studentStyles.section}>{entry.mood}</AppText><AppText variant="caption" style={studentStyles.muted}>{formatEntryDate(entry.createdAt)}</AppText></View></View>
      {entry.note ? <AppText style={{ fontSize: 14 }}>{entry.note}</AppText> : null}
      {confirmId === entry.id ? <View style={{ gap: 8 }}>
        <AppText accessibilityRole="alert">Delete this entry? Your mood and note will be permanently removed.</AppText>
        <CareButton danger title={deleting ? 'Deleting...' : 'Confirm Delete'} disabled={deleting} onPress={() => remove(entry.id)} />
        <CareButton title="Cancel" secondary disabled={deleting} onPress={() => setConfirmId(null)} />
      </View> : <View style={studentStyles.row}>
        <View style={studentStyles.flex}><CareButton title="Edit" compact secondary disabled={deleting} onPress={() => router.push({ pathname: '/anonymous/mood/edit/[id]', params: { id: entry.id } })} /></View>
        <View style={studentStyles.flex}><CareButton danger compact title="Delete" secondary disabled={deleting} onPress={() => { setConfirmId(entry.id); setNotice(''); }} /></View>
      </View>}
    </StudentCard>)}
  </StudentScreen>;
}
