import { WellnessHeroCard, FeatureBanner, QuickActionTile, SectionHeader, wellnessLayout } from '@/components/wellness-ui';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/text';
import { CareIcon } from '@/components/care-icon';
import { AppointmentReminderBanner } from '@/components/appointment-reminder-banner';
import { StudentScreen, StatusMessage } from '@/components/student-screen';
import { CareButton, StudentCard, studentStyles } from '@/components/student-ui';
import { MoodFace } from '@/components/mood-option-card';
import { LogoutButton } from '@/components/logout-button';
import { getCurrentUser } from '@/services/auth';
import { getUserProfile } from '@/services/user-profile';
import { getMoodEntriesForUser, type MoodEntry } from '@/services/mood';
import { getAuthErrorMessage } from '@/utils/auth';
import { Colors } from '@/constants/colors';
import { BorderRadius } from '@/constants/border-radius';

const practices = [
  { title: 'Box Breathing', description: 'Pause & breathe', time: '2 min', icon: 'breath' },
  { title: 'Quick Unwind', description: 'A gentle reset', time: '3 min', icon: 'leaf' },
  { title: 'Mindful Walking', description: 'Move & notice', time: '5 min', icon: 'walk' },
] as const;
export default function StudentHomeRoute() {
  const router = useRouter();
  const [name, setName] = useState('there');
  const [today, setToday] = useState<MoodEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useFocusEffect(useCallback(() => {
    void attempt;
    let active = true;
    setLoading(true); setError('');
    async function load() {
      const user = getCurrentUser();
      if (!user) return;
      const [profile, moods] = await Promise.allSettled([getUserProfile(user.uid), getMoodEntriesForUser()]);
      if (!active) return;
      if (profile.status === 'fulfilled') setName(profile.value?.name.trim().split(/\s+/)[0] || 'there');
      if (moods.status === 'fulfilled') setToday(moods.value.find(entry => entry.createdAt?.toDate().toDateString() === new Date().toDateString()) ?? null);
      else { setToday(null); setError(getAuthErrorMessage(moods.reason)); }
      if (profile.status === 'rejected') setError(getAuthErrorMessage(profile.reason));
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [attempt]));
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return <StudentScreen title={greeting + ', ' + name} showHome={false} eyebrow="WELCOME BACK">
    <WellnessHeroCard eyebrow="YOUR CAMPUS. YOUR CALM." title="Make a little room for you." description="A pause, a conversation, a small step. Your wellbeing belongs here." />
    <AppointmentReminderBanner />
    <SectionHeader title="Your daily check-in" />
    <StudentCard style={styles.moodCard}>
      <View style={studentStyles.row}><View style={studentStyles.flex}><AppText style={studentStyles.label}>TODAY&apos;S MOOD</AppText><AppText style={studentStyles.section}>{today ? 'Feeling ' + today.mood.toLowerCase() : 'How are you feeling today?'}</AppText></View>{today ? <MoodFace mood={today.mood} size={52} /> : <CareIcon name="good" size={52} />}</View>
      {loading ? <ActivityIndicator color={Colors.careGreen} /> : error ? <><StatusMessage message={error} error /><CareButton title="Try again" secondary onPress={() => setAttempt(value => value + 1)} /></> : <>
        <AppText variant="caption" style={studentStyles.muted}>{today ? 'Checked in at ' + today.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Every feeling is welcome. Let us start with yours.'}</AppText>
        <CareButton title={today ? 'Retake' : 'Check In Now'} onPress={() => router.push('/student/mood')} />
      </>}
    </StudentCard>
    <SectionHeader title="Your campus care" subtitle="A few useful places to start." />
    <View style={wellnessLayout.grid}><QuickActionTile title="Mood History" subtitle="Look back with kindness" icon="good" tone="mint" onPress={() => router.push('/student/mood/history')} /><QuickActionTile title="My Appointments" subtitle="Your next conversation" icon="clock" tone="blue" onPress={() => router.push('/student/appointments')} /><QuickActionTile title="Live Support" subtitle="Talk to a counselor" icon="chat" tone="lavender" onPress={() => router.push('/student/chat')} /><QuickActionTile title="Saved Resources" subtitle="Keep what helps" icon="book" tone="amber" onPress={() => router.push('/student/resources/saved')} /></View>
    <View><AppText style={studentStyles.section}>Small moments, big care</AppText><AppText variant="caption" style={studentStyles.muted}>Micro-practices to explore · activities coming soon</AppText></View>
    <View style={styles.practices}>{practices.map(practice => <StudentCard key={practice.title} style={[styles.practice, { backgroundColor: practice.icon === 'breath' ? Colors.carePale : practice.icon === 'leaf' ? Colors.careBadge : Colors.careLavender }]}><View style={styles.practiceIcon}><CareIcon name={practice.icon} size={23} /></View><AppText style={styles.practiceTitle}>{practice.title}</AppText><AppText variant="caption" style={styles.small}>{practice.description}</AppText><AppText variant="caption" style={styles.duration}>{practice.time}</AppText></StudentCard>)}</View>
    <StudentCard style={styles.support}><View style={studentStyles.row}><CareIcon name="heart" color={Colors.onPrimary} size={24} /><AppText style={styles.supportTitle}>Student Support & Care</AppText></View><AppText style={styles.supportBody}>You do not have to carry everything alone. Find a little guidance or reach out for help.</AppText><CareButton title="Chat Now" secondary onPress={() => router.push('/student/chat')} /><CareButton title="Crisis Support" secondary onPress={() => router.push('/student/crisis-support')} /></StudentCard>
    <FeatureBanner title="Find your next small reset" description="Explore the wellbeing library for gentle practices in sleep, focus and everyday calm." icon="leaf" tone="lavender"><CareButton title="Explore Resources" secondary onPress={() => router.push('/student/resources')} /></FeatureBanner>
    <LogoutButton />
  </StudentScreen>;
}
const styles = StyleSheet.create({ moodCard: { backgroundColor: Colors.surface, padding: 24, gap: 16, borderRadius: 22 }, practices: { gap: 8 }, practice: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', minWidth: 0, padding: 12, gap: 8, borderRadius: 16, boxShadow: 'none' }, practiceIcon: { width: 40, height: 48, backgroundColor: Colors.surface, borderRadius: BorderRadius.medium, alignItems: 'center', justifyContent: 'center' }, practiceTitle: { flex: 1, minWidth: 100, color: Colors.careGreen, fontSize: 12, lineHeight: 16, fontWeight: '600' }, small: { color: Colors.careMuted, fontSize: 12, lineHeight: 18 }, duration: { color: Colors.careGreen, fontSize: 12 }, support: { backgroundColor: Colors.careGreen, borderColor: Colors.careGreen, padding: 24, gap: 16, borderRadius: 24 }, supportTitle: { color: Colors.onPrimary, fontSize: 17, fontWeight: '600', flex: 1 }, supportBody: { color: Colors.carePale, fontSize: 13, lineHeight: 21 } });
