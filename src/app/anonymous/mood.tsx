import { useRouter } from 'expo-router';
import { MoodForm } from '@/components/mood-form';
import { CareButton, studentStyles } from '@/components/student-ui';
import { AppText } from '@/components/text';
import { StudentScreen } from '@/components/student-screen';
import { createMoodEntry } from '@/services/anonymous-mood';
export default function MoodRoute() {
  const router = useRouter();
  return <StudentScreen anonymous title="How are you feeling today?">
    <AppText style={studentStyles.muted}>Take a moment to check in with yourself.</AppText>
    <MoodForm onSave={createMoodEntry} onSaved={() => router.replace('/anonymous/mood/history')} />
    <CareButton title="View Mood History" secondary onPress={() => router.push('/anonymous/mood/history')} />
  </StudentScreen>;
}
