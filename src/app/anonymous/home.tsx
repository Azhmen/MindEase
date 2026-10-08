import { FeatureBanner } from '@/components/wellness-ui';
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { View } from 'react-native';
import { LoadingState, StudentScreen, StatusMessage } from '@/components/student-screen';
import { CareButton, StudentCard, studentStyles } from '@/components/student-ui';
import { CareIcon } from '@/components/care-icon';
import { MoodFace } from '@/components/mood-option-card';
import { AppText } from '@/components/text';
import { AnonymousExitButton } from '@/components/anonymous-exit-button';
import { getMoodEntriesForUser, type MoodEntry } from '@/services/anonymous-mood';
import { getAuthErrorMessage } from '@/utils/auth';
import { Colors } from '@/constants/colors';

export default function AnonymousHomeRoute() {
  const router = useRouter();
  const [today, setToday] = useState<MoodEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useFocusEffect(useCallback(() => {
    void attempt;
    let active = true;
    setLoading(true); setError('');
    getMoodEntriesForUser().then(entries => {
      if (active) setToday(entries.find(entry => entry.createdAt?.toDate().toDateString() === new Date().toDateString()) ?? null);
    }).catch(err => { if (active) setError(getAuthErrorMessage(err)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]));
  return <StudentScreen anonymous showHome={false} eyebrow="ANONYMOUS / GUEST" title="A little space for you">
    <FeatureBanner title="Your space, your privacy" description="Anonymous mode does not collect your name, email or student ID. A system-generated anonymous Firebase UID securely isolates your session data." icon="anonymous" tone="mint" />
    <StudentCard style={{ backgroundColor: Colors.surface, padding: 20 }}>
      <View style={studentStyles.row}><View style={studentStyles.flex}><AppText style={studentStyles.label}>TODAY&apos;S MOOD</AppText><AppText style={studentStyles.section}>{today ? 'Feeling ' + today.mood.toLowerCase() : 'How are you feeling today?'}</AppText></View>{today ? <MoodFace mood={today.mood} size={52} /> : <CareIcon name="good" size={52} />}</View>
      {loading ? <LoadingState /> : null}<StatusMessage message={error} error />
      {error ? <CareButton title="Try again" secondary onPress={() => setAttempt(value => value + 1)} /> : null}
      {today ? <AppText variant="caption" style={studentStyles.muted}>Checked in at {today.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</AppText> : null}
      <CareButton title={today ? 'Retake Mood Check-in' : 'Mood Check-in'} onPress={() => router.push('/anonymous/mood')} />
    </StudentCard>
    <CareButton title="Mood History" secondary onPress={() => router.push('/anonymous/mood/history')} />
    <AppText style={studentStyles.section}>Small moments, big care</AppText>
    <View style={{ gap: 8 }}>{['Box Breathing', 'Quick Unwind', 'Mindful Walking'].map(title => <StudentCard key={title} style={{ flexDirection: 'row', alignItems: 'center', minWidth: 0, padding: 14, backgroundColor: Colors.surface }}><CareIcon name="leaf" /><AppText style={{ flex: 1, fontSize: 14, color: Colors.careGreen }}>{title}</AppText><AppText style={{ fontSize: 12, color: Colors.careMuted }}>Activity coming soon</AppText></StudentCard>)}</View>
    <StudentCard style={{ backgroundColor: Colors.careGreen, padding: 24, borderRadius: 24 }}><AppText style={{ color: Colors.onPrimary, fontSize: 18 }}>Student Support &amp; Care</AppText><AppText style={{ color: Colors.onPrimary, fontSize: 14 }}>Talk with a real counselor as Anonymous Student. Chat is not an emergency service.</AppText><CareButton title="Live Support" secondary onPress={() => router.push('/anonymous/chat')} /><CareButton title="Crisis Support" secondary onPress={() => router.push('/anonymous/crisis-support')} /></StudentCard>
    <AppText variant="caption" style={studentStyles.muted}>Refreshing keeps this session. Back to Login ends it; its data will not be linked to a student account.</AppText>
    <AnonymousExitButton />
  </StudentScreen>;
}
