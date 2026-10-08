import { BotanicalArt } from '@/components/presentation';
import { Typography } from '@/constants/typography';
import { FeatureBanner, IllustratedEmptyState, StatTile, wellnessLayout } from '@/components/wellness-ui';
import { useCounselorSchedule } from '@/hooks/use-counselor-schedule';
import { SessionCard } from '@/components/counselor-management-screens';
import { localDateString } from '@/constants/booking';
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { CounselorFrame, CounselorHeader } from '@/components/counselor-ui';
import { CareButton, StudentCard, studentStyles } from '@/components/student-ui';
import { CareIcon } from '@/components/care-icon';
import { AppText } from '@/components/text';
import { StatusMessage, formatEntryDate } from '@/components/student-screen';
import { LogoutButton } from '@/components/logout-button';
import { getCurrentUser } from '@/services/auth';
import { getUserProfile } from '@/services/user-profile';
import { counselorConversationRoute, isAnonymousThread, useCounselorThreads } from '@/hooks/use-counselor-threads';
import { getAuthErrorMessage } from '@/utils/auth';
import { Colors } from '@/constants/colors';
import { BorderRadius } from '@/constants/border-radius';

export default function CounselorDashboardRoute() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [profileAttempt, setProfileAttempt] = useState(0);
  const [title, setTitle] = useState('');
  const { threads, loading, error, reconnect } = useCounselorThreads();

  useFocusEffect(useCallback(() => {
    void profileAttempt;
    let active = true;
    setProfileLoading(true); setProfileError('');
    const user = getCurrentUser();
    if (!user) { setProfileLoading(false); return; }
    getUserProfile(user.uid).then(profile => {
      if (!active) return;
      if (!profile || profile.role !== 'counselor') throw new Error('Your counselor profile could not be loaded.');
      setName(profile.name?.trim() || '');
      setTitle(profile.title?.trim() || '');
    }).catch(err => { if (active) setProfileError(getAuthErrorMessage(err)); })
      .finally(() => { if (active) setProfileLoading(false); });
    return () => { active = false; };
  }, [profileAttempt]));

  const schedule = useCounselorSchedule();
  const now = new Date();
  const today = localDateString(now);
  const todaySessions = schedule.sessions.filter(s => s.appointmentDate === today && s.status !== 'cancelled');
  const virtualCount = schedule.sessions.filter(s => s.appointmentDate >= today && s.sessionFormat === 'Virtual' && !['cancelled', 'completed'].includes(s.status)).length;
  const availableCount = schedule.slots.filter(s => s.isAvailable && new Date(s.date + 'T' + s.startTime + ':00').getTime() > now.getTime()).length;
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = name ? (/^(dr\.?|counselor)\s/i.test(name) ? name : 'Counselor ' + name) : 'Counselor';
  const recent = threads.slice(0, 2);
  return <CounselorFrame>
    <CounselorHeader name={name} />
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.identity}>
        <View style={styles.avatar}><CareIcon name="profile" size={22} /></View>
        <View style={studentStyles.flex}><AppText style={styles.identityName}>{profileLoading ? 'Loading profile...' : displayName}</AppText><AppText style={styles.caption}>{title || 'Campus Psychological Services'}</AppText></View>
        <View style={styles.status}><View style={styles.dot} /><AppText style={styles.statusText}>Signed in</AppText></View>
      </View>
      <View style={styles.welcome}><AppText style={styles.greeting}>{greeting}{name ? ', ' + name : ''}</AppText><AppText style={styles.caption}>{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</AppText></View>
      {profileError ? <View style={styles.group}><StatusMessage message={profileError} error /><CareButton title="Retry profile" secondary onPress={() => setProfileAttempt(value => value + 1)} /></View> : null}

      {/* Kiyathan: assigned appointments and own availability; chat stays independent. */}
      {schedule.loading ? <ActivityIndicator /> : null}<StatusMessage message={schedule.error} error />{schedule.error ? <CareButton title="Retry schedule" secondary onPress={schedule.retry} /> : null}
      <View style={styles.summaryRow}>{[{ label: 'Today', icon: 'clock', hint: 'Assigned sessions', value: todaySessions.length }, { label: 'Virtual', icon: 'chat', hint: 'Today / upcoming', value: virtualCount }, { label: 'Available', icon: 'leaf', hint: 'Future slots', value: availableCount }].map(item => <StatTile key={item.label} label={item.label} value={schedule.loading || schedule.error ? '?' : item.value} hint={item.hint} tone={item.label === 'Virtual' ? 'blue' : item.label === 'Available' ? 'mint' : 'mint'} />)}</View>

      <StudentCard style={styles.queue}><View style={[styles.queueArt, { pointerEvents: 'none' }]}><BotanicalArt size={100} /></View>
        <View style={studentStyles.row}><View style={styles.queueIcon}><CareIcon name="chat" size={22} /></View><View style={studentStyles.flex}><AppText style={styles.sectionTitle}>Live Student Chats</AppText><AppText style={styles.caption}>Connect with students who need support.</AppText></View></View>
        {loading ? <View style={studentStyles.row}><ActivityIndicator color={Colors.careGreen} /><AppText style={styles.body}>Loading assigned conversations...</AppText></View> : error ? <><StatusMessage message={error} error /><CareButton title="Retry conversations" secondary onPress={reconnect} /></> : <>
          <View style={studentStyles.row}><AppText style={styles.count}>{threads.length}</AppText><AppText style={styles.body}>assigned conversation{threads.length === 1 ? '' : 's'}</AppText></View>
          {recent.length ? <View style={styles.group}><AppText style={styles.eyebrow}>RECENT CONVERSATIONS</AppText>{recent.map(thread => <Pressable key={(isAnonymousThread(thread) ? 'anonymous:' : 'student:') + thread.id} accessibilityRole="button" accessibilityLabel={'Open ' + (isAnonymousThread(thread) ? 'Anonymous Student' : 'student conversation')} onPress={() => router.push(counselorConversationRoute(thread))} style={styles.recentCard}>
            <View style={styles.recentAvatar}><CareIcon name={isAnonymousThread(thread) ? 'anonymous' : 'profile'} size={18} /></View>
            <View style={studentStyles.flex}><AppText style={styles.recentName}>{isAnonymousThread(thread) ? 'Anonymous Student' : 'Student conversation'}</AppText><AppText numberOfLines={1} style={styles.recentPreview}>{thread.lastMessage || 'No messages yet.'}</AppText><AppText style={styles.recentTime}>{formatEntryDate(thread.lastMessageAt ?? thread.createdAt)}</AppText></View><CareIcon name="arrow" size={14} />
          </Pressable>)}</View> : <AppText style={styles.body}>No assigned chats yet. New conversations will appear here.</AppText>}
        </>}
        <CareButton title="Open Messages" onPress={() => router.push('/counselor/chats')} />
      </StudentCard>

      <View style={styles.sectionHeader}><AppText style={styles.sectionTitle}>Today&apos;s Sessions</AppText></View>
      <CareButton title="View All Sessions" secondary onPress={() => router.push('/counselor/sessions')} />
      {!schedule.loading && !schedule.error ? todaySessions.length ? todaySessions.map(session => <View key={session.id} style={styles.timeline}><SessionCard session={session} /></View>) : <IllustratedEmptyState title="No sessions scheduled." description="Assigned sessions for today will appear here." icon="clock" /> : null}

      <FeatureBanner title="Your availability" description={schedule.loading || schedule.error ? 'Your published schedule' : availableCount + ' future slots available for booking'} icon="clock" tone="mint"><CareButton title="Manage Schedule" secondary onPress={() => router.push('/counselor/availability')} /></FeatureBanner>
      <AppText style={styles.sectionTitle}>Quick Actions</AppText>
      <View style={wellnessLayout.grid}>
        <View accessibilityLabel="Box Focus Time. Mindful Break. Coming soon." style={styles.tool}><View style={styles.toolIcon}><CareIcon name="leaf" size={21} /></View><View style={studentStyles.flex}><AppText style={styles.toolTitle}>Box Focus Time</AppText><AppText style={styles.caption}>Mindful Break · Coming soon</AppText></View><AppText style={styles.badge}>SOON</AppText></View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/counselor/crisis-support')} style={[styles.tool, styles.alertTool]}><View style={[styles.toolIcon, styles.alertIcon]}><CareIcon name="shield" size={21} color={Colors.error} /></View><View style={studentStyles.flex}><AppText style={[styles.toolTitle, styles.alertTitle]}>Emergency Escalation Protocol</AppText><AppText style={styles.caption}>Open crisis support information</AppText></View><CareIcon name="arrow" size={15} color={Colors.error} /></Pressable>
        {/* A portal preview must not bypass counselor/student role protection. */}
        <View accessibilityLabel="Switch to Student Portal View. Preview coming soon." style={styles.tool}><View style={styles.toolIcon}><CareIcon name="profile" size={21} /></View><View style={studentStyles.flex}><AppText style={styles.toolTitle}>Switch to Student Portal View</AppText><AppText style={styles.caption}>Preview coming soon</AppText></View><AppText style={styles.badge}>SOON</AppText></View>
      </View>
      <LogoutButton />
      <AppText style={styles.footer}>MindEase · Campus Care</AppText>
    </ScrollView>
  </CounselorFrame>;
}
const styles = StyleSheet.create({
  scroll: { flex: 1, minHeight: 0 },
  content: { padding: 20, paddingBottom: 24, gap: 20 },
  group: { gap: 8 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: Colors.careLavender, borderRadius: 24 },
  avatar: { width: 40, height: 40, borderRadius: BorderRadius.round, backgroundColor: Colors.carePale, alignItems: 'center', justifyContent: 'center' },
  identityName: { color: Colors.careGreen, fontSize: 15, lineHeight: 22, fontWeight: '600' },
  caption: { color: Colors.careMuted, fontSize: 12, lineHeight: 18 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, backgroundColor: Colors.carePale, paddingHorizontal: 7, paddingVertical: 5 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.careGreen },
  statusText: { fontSize: 11, lineHeight: 18, color: Colors.careGreen },
  welcome: { gap: 5 },
  greeting: { color: Colors.careGreen, fontFamily: Typography.fontFamily.editorial, fontSize: 28, lineHeight: 36, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryCard: { flex: 1, minWidth: 0, padding: 12, gap: 4, backgroundColor: Colors.carePale, boxShadow: '0 2px 6px ' + Colors.careShadow },
  summaryValue: { color: Colors.careGreen, fontSize: 25, lineHeight: 30, fontWeight: '700' },
  summaryLabel: { color: Colors.careGreen, fontSize: 12, lineHeight: 16, fontWeight: '600' },
  summaryHint: { color: Colors.careMuted, fontSize: 11, lineHeight: 18 },
  queueArt: { position: 'absolute', right: -30, top: -20, opacity: 0.2 }, queue: { overflow: 'hidden', backgroundColor: Colors.careBadge, padding: 20, borderRadius: 22, gap: 16 },
  queueIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: Colors.careGreen, fontSize: 19, lineHeight: 26, fontWeight: '700' },
  count: { color: Colors.careGreen, fontSize: 28, lineHeight: 36, fontWeight: '700' },
  body: { color: Colors.careMuted, fontSize: 12, lineHeight: 17, flexShrink: 1 },
  eyebrow: { color: Colors.careMuted, fontSize: 11, lineHeight: 18, letterSpacing: 0.8 },
  recentCard: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 0 },
  recentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.carePale, alignItems: 'center', justifyContent: 'center' },
  recentName: { color: Colors.careGreen, fontSize: 12, lineHeight: 16, fontWeight: '600' },
  recentPreview: { color: Colors.careMuted, fontSize: 12, lineHeight: 18 },
  recentTime: { color: Colors.careMuted, fontSize: 11, lineHeight: 18, marginTop: 3 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  badge: { color: Colors.careMuted, backgroundColor: Colors.careInput, fontSize: 11, lineHeight: 18, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4 },
  sessionCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  emptyTitle: { color: Colors.careGreen, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  timeline: { gap: 12 },
  tool: { flexGrow: 1, flexBasis: '45%', flexDirection: 'column', alignItems: 'flex-start', gap: 12, borderRadius: 22, backgroundColor: Colors.careLavender, padding: 16 },
  toolIcon: { width: 35, height: 35, borderRadius: 11, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  toolTitle: { color: Colors.careGreen, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  alertTool: { backgroundColor: Colors.careAlert, borderColor: Colors.careAlertBorder },
  alertIcon: { backgroundColor: Colors.surface },
  alertTitle: { color: Colors.error },
  footer: { color: Colors.careMuted, textAlign: 'center', fontSize: 12, lineHeight: 18 },
});
