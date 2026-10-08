import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { AppText } from '@/components/text';
import { MoodForm } from '@/components/mood-form';
import { CareButton, studentStyles } from '@/components/student-ui';
import { StudentScreen, StatusMessage } from '@/components/student-screen';
import { deleteMoodEntry, getMoodEntry, updateMoodEntry, type MoodEntry } from '@/services/mood';
import { useGihaniAction } from '@/components/gihani-ui';
import { getAuthErrorMessage } from '@/utils/auth';

// Azhmen's mood_entries update screen; this does not edit Gihani's future reflections.
export default function EditMoodRoute() {
  const { id, action } = useLocalSearchParams<{ id: string; action?: string }>();
  return <EditMoodEntry key={`${id}:${action}`} id={id} confirmDeleteInitially={action === 'delete'} />;
}
function EditMoodEntry({ id, confirmDeleteInitially }: { id: string; confirmDeleteInitially: boolean }) {
  const router = useRouter();
  const [entry, setEntry] = useState<MoodEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(confirmDeleteInitially);
  const [saving, setSaving] = useState(false);
  const deletion = useGihaniAction();
  useEffect(() => {
    let active = true;
    getMoodEntry(id).then(data => { if (active) setEntry(data); }).catch(err => { if (active) setError(getAuthErrorMessage(err)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, attempt]);
  return <StudentScreen title="Edit your check-in">
    <AppText style={studentStyles.muted}>Update your mood or note. Every feeling is welcome.</AppText>
    {loading ? <ActivityIndicator /> : null}<StatusMessage message={error} error />
    {error ? <CareButton title="Try again" secondary onPress={() => { setLoading(true); setError(''); setAttempt(value => value + 1); }} /> : null}
    {entry && !confirmDelete ? <MoodForm key={id} initialMood={entry.mood} initialNote={entry.note} onSave={async (mood, note) => { setSaving(true); try { await updateMoodEntry(id, mood, note); } finally { setSaving(false); } }} onSaved={() => router.replace('/student/mood/history')} /> : null}
    <StatusMessage message={deletion.error} error />
    {entry ? confirmDelete ? <>
      <AppText accessibilityRole="alert">Delete this check-in? Your mood and note will be permanently removed.</AppText>
      <CareButton danger title={deletion.busy ? 'Deleting…' : 'Confirm Delete Check-in'} disabled={deletion.busy} onPress={() => deletion.run(async () => { await deleteMoodEntry(id); router.replace('/student/mood/history'); })} />
      <CareButton title="Keep Check-in" secondary disabled={deletion.busy} onPress={() => setConfirmDelete(false)} />
    </> : <CareButton title="Delete Check-in" danger secondary disabled={saving} onPress={() => setConfirmDelete(true)} /> : null}
    <CareButton title="Back to Mood History" secondary disabled={saving || deletion.busy} onPress={() => router.replace('/student/mood/history')} />
  </StudentScreen>;
}
