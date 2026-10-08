import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { AppText } from '@/components/text';
import { MoodForm } from '@/components/mood-form';
import { CareButton, studentStyles } from '@/components/student-ui';
import { StudentScreen, StatusMessage } from '@/components/student-screen';
import { getMoodEntry, updateMoodEntry, type MoodEntry } from '@/services/anonymous-mood';
import { getAuthErrorMessage } from '@/utils/auth';

// Anonymous mood update: Firebase anonymous UID ownership is enforced by service and rules.
export default function EditMoodRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditMoodEntry key={id} id={id} />;
}
function EditMoodEntry({ id }: { id: string }) {
  const router = useRouter();
  const [entry, setEntry] = useState<MoodEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    getMoodEntry(id).then(data => { if (active) setEntry(data); }).catch(err => { if (active) setError(getAuthErrorMessage(err)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, attempt]);
  return <StudentScreen anonymous title="Edit your check-in">
    <AppText style={studentStyles.muted}>Update your mood or note. Every feeling is welcome.</AppText>
    {loading ? <ActivityIndicator /> : null}<StatusMessage message={error} error />
    {error ? <CareButton title="Try again" secondary onPress={() => { setLoading(true); setError(''); setAttempt(value => value + 1); }} /> : null}
    {entry ? <MoodForm key={id} initialMood={entry.mood} initialNote={entry.note} onSave={(mood, note) => updateMoodEntry(id, mood, note)} onSaved={() => router.replace('/anonymous/mood/history')} /> : null}
    <CareButton title="Back to Mood History" secondary onPress={() => router.replace('/anonymous/mood/history')} />
  </StudentScreen>;
}
