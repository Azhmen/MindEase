import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/text';
import { CareIcon } from '@/components/care-icon';
import { MoodFace } from '@/components/mood-option-card';
import { CareButton, StudentCard, studentStyles } from '@/components/student-ui';
import { LoadingState, StudentScreen, StatusMessage } from '@/components/student-screen';
import { MoodLogCard } from '@/components/mood-log-card';
import { getMoodEntriesForUser, type MoodEntry } from '@/services/mood';
import { getMoodReflectionsForUser, type MoodReflection } from '@/services/mood-reflections';
import { getAuthErrorMessage } from '@/utils/auth';
import { MOOD_RANGES, moodRhythm, type MoodRange } from '@/utils/mood-rhythm';
import { Colors } from '@/constants/colors';

export default function MoodHistoryRoute() {
  const router = useRouter();
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [reflections, setReflections] = useState<MoodReflection[]>([]);
  const [reflectionLoading, setReflectionLoading] = useState(true);
  const [reflectionError, setReflectionError] = useState('');
  const [reflectionAttempt, setReflectionAttempt] = useState(0);
  const [range, setRange] = useState<MoodRange>('This Week');
  const [now, setNow] = useState(() => new Date());
  useFocusEffect(useCallback(() => {
    void attempt;
    let active = true; setLoading(true); setError(''); setEntries([]); setNow(new Date());
    getMoodEntriesForUser().then(data => { if (active) setEntries(data); }).catch(err => { if (active) setError(getAuthErrorMessage(err)); }).finally(() => { if (active) setLoading(false); });
    const clock = setInterval(() => setNow(new Date()), 60000);
    return () => { active = false; clearInterval(clock); };
  }, [attempt]));
  useFocusEffect(useCallback(() => {
    void reflectionAttempt;
    let active = true; setReflectionLoading(true); setReflectionError('');
    getMoodReflectionsForUser().then(data => { if (active) setReflections(data); }).catch(err => { if (active) setReflectionError(getAuthErrorMessage(err)); }).finally(() => { if (active) setReflectionLoading(false); });
    return () => { active = false; };
  }, [reflectionAttempt]));
  const rhythm = moodRhythm(entries, range, now);
  const ready = !loading && !error;
  return <StudentScreen title="Mood Rhythm" eyebrow="WEEKLY REFLECTION • PRIVATE" eyebrowStyle={styles.badge} headingStyle={styles.heading}>
    <AppText style={styles.subtitle}>Keep checking in with yourself. Every emotion is a valid step forward in your academic journey.</AppText>
    <Pressable accessibilityRole="button" accessibilityLabel="New Check-in" onPress={() => router.push('/student/mood')} style={styles.newButton}><AppText style={styles.newLabel}>New Check-in</AppText><CareIcon name="arrow" size={20} color={Colors.onPrimary} /></Pressable>
    <View accessibilityRole="tablist" style={styles.tabs}>{MOOD_RANGES.map(tab => <Pressable key={tab} accessibilityRole="tab" accessibilityState={{ selected: range === tab }} onPress={() => setRange(tab)} style={[styles.tab, range === tab && styles.activeTab]}><AppText style={[styles.tabText, range === tab && styles.activeText]}>{tab}</AppText></Pressable>)}</View>
    {loading ? <LoadingState /> : null}<StatusMessage message={error} error />
    {error ? <CareButton title="Try again" secondary onPress={() => setAttempt(value => value + 1)} /> : null}
    <StudentCard style={styles.balance}>
      <View style={studentStyles.row}><View style={studentStyles.flex}><AppText style={styles.cardTitle}>Weekly Balance</AppText><AppText style={styles.small}>{ready ? `${rhythm.count} of 7 check-ins recorded` : loading ? 'Loading your check-ins…' : 'Check-ins unavailable'}</AppText></View><View style={styles.pill}><AppText style={styles.pillText}>{ready ? rhythm.status : 'Your week'}</AppText></View></View>
      <View style={styles.week}>{rhythm.week.map((day, index) => <View key={index} style={styles.day}>
        <View accessibilityLabel={`${day.date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}: ${ready ? day.entry?.mood ?? 'No check-in' : 'Unavailable'}`} style={[styles.face, day.entry && styles.recorded, day.today && styles.todayFace]}>{ready && day.entry ? <MoodFace mood={day.entry.mood} size={27} /> : <View style={styles.emptyDot} />}</View>
        <AppText style={[styles.dayLabel, day.today && styles.todayLabel]}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}</AppText><AppText style={styles.today}>{day.today ? 'Today' : ' '}</AppText>
      </View>)}</View>
      <AppText style={styles.weekCaption}>This week · latest check-in each day</AppText>
      <View style={styles.stats}><View style={styles.stat}><CareIcon name="mood" size={20} /><AppText style={styles.statLabel}>Most Frequent</AppText><AppText style={styles.statValue}>{ready ? rhythm.frequent ? `${rhythm.frequent[0]} • ${rhythm.frequent[1]} ${rhythm.frequent[1] === 1 ? 'day' : 'days'}` : 'No check-ins yet' : '—'}</AppText><AppText style={styles.small}>{range}</AppText></View><View style={[styles.stat, styles.blue]}><CareIcon name="leaf" size={20} /><AppText style={styles.statLabel}>Check-in Streak</AppText><AppText style={styles.statValue}>{ready ? `${rhythm.streak} ${rhythm.streak === 1 ? 'Day' : 'Days'} Active` : '—'}</AppText><AppText style={styles.small}>Consecutive days</AppText></View></View>
    </StudentCard>
    <StudentCard style={styles.wellness}><View style={studentStyles.row}><View style={styles.wellnessIcon}><CareIcon name="breath" size={26} /></View><View style={studentStyles.flex}><AppText style={styles.cardTitle}>A little room to breathe</AppText><AppText style={styles.small}>Take a 2-min breath before your next lecture. A small pause can make space for your next step.</AppText></View></View><CareButton title="Breathe" secondary onPress={() => router.push('/student/resources')} /></StudentCard>
    <View style={styles.sectionRow}><AppText style={styles.cardTitle}>Recent Logs</AppText><AppText style={styles.small}>{ready ? `${entries.length} entries total` : '— entries total'}</AppText></View>
    {reflectionLoading ? <ActivityIndicator accessibilityLabel="Loading reflections" color={Colors.careGreen} /> : null}<StatusMessage message={reflectionError} error />
    {reflectionError ? <CareButton title="Retry Reflections" secondary onPress={() => setReflectionAttempt(value => value + 1)} /> : null}
    {ready && !rhythm.recent.length ? <StudentCard><AppText style={styles.cardTitle}>A fresh space for your feelings</AppText><AppText style={styles.small}>No check-ins in this range yet. Every feeling is welcome whenever you are ready.</AppText></StudentCard> : null}
    <View style={styles.logs}>{ready ? rhythm.recent.map(entry => <MoodLogCard key={entry.id} entry={entry} reflection={reflections.find(item => item.moodEntryId === entry.id)} reflectionDisabled={reflectionLoading || !!reflectionError} onReflectionChanged={text => { setReflections(current => text === null ? current.filter(item => item.moodEntryId !== entry.id) : [...current.filter(item => item.moodEntryId !== entry.id), { ...(current.find(item => item.moodEntryId === entry.id) ?? { id: entry.id, userId: entry.userId, moodEntryId: entry.id, createdAt: null, updatedAt: null }), reflection: text }]); }} />) : null}</View>
    <StudentCard style={styles.insight}><CareIcon name="leaf" size={26} /><AppText style={styles.cardTitle}>Notice a pattern in your week?</AppText><AppText style={styles.small}>{ready && rhythm.weekEntries ? `You checked in ${rhythm.weekEntries} ${rhythm.weekEntries === 1 ? 'time' : 'times'} this week. Take a moment to notice what supported you.` : 'Keep checking in to see patterns over time.'}</AppText><CareButton title="Explore Self-Help" onPress={() => router.push('/student/resources')} /><CareButton title="Live Support" secondary onPress={() => router.push('/student/chat')} /></StudentCard>
  </StudentScreen>;
}
const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', backgroundColor: Colors.carePale, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, fontSize: 11, letterSpacing: 0.5 }, heading: { fontSize: 30, lineHeight: 38 },
  subtitle: { color: Colors.careMuted, fontSize: 14, lineHeight: 23, marginTop: -10 },
  newButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, alignSelf: 'flex-start', backgroundColor: Colors.careGreen, paddingHorizontal: 20, minHeight: 46, borderRadius: 24 }, newLabel: { color: Colors.onPrimary, fontWeight: '600', fontSize: 14 },
  tabs: { flexDirection: 'row', backgroundColor: Colors.careInput, borderRadius: 24, padding: 5 }, tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 20 }, activeTab: { backgroundColor: Colors.surface, boxShadow: '0 2px 8px ' + Colors.careShadow }, tabText: { color: Colors.careMuted, fontSize: 12, fontWeight: '500' }, activeText: { color: Colors.careGreen, fontWeight: '700' },
  balance: { backgroundColor: Colors.onPrimary, borderRadius: 22, padding: 18, gap: 20 }, cardTitle: { fontSize: 19, lineHeight: 25, fontWeight: '600', color: Colors.careGreen }, small: { color: Colors.careMuted, fontSize: 12, lineHeight: 18 }, pill: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.carePale, maxWidth: 106 }, pillText: { color: Colors.careGreen, fontSize: 10, fontWeight: '600' },
  week: { flexDirection: 'row', justifyContent: 'space-between', gap: 2 }, day: { flex: 1, alignItems: 'center', gap: 8 }, face: { width: 34, height: 38, borderRadius: 18, backgroundColor: Colors.careInput, justifyContent: 'center', alignItems: 'center' }, recorded: { backgroundColor: Colors.carePale }, todayFace: { borderWidth: 1.5, borderColor: Colors.careAccent }, emptyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.careBorder }, dayLabel: { color: Colors.careMuted, fontSize: 10 }, todayLabel: { color: Colors.careGreen, fontWeight: '700' }, today: { color: Colors.careGreen, fontSize: 9, fontWeight: '600' }, weekCaption: { color: Colors.careMuted, fontSize: 10, textAlign: 'center', marginTop: -10 },
  stats: { flexDirection: 'row', gap: 10 }, stat: { flex: 1, backgroundColor: Colors.carePale, borderRadius: 20, padding: 14, gap: 6 }, blue: { backgroundColor: Colors.careBadge }, statLabel: { color: Colors.careMuted, fontSize: 11 }, statValue: { color: Colors.careGreen, fontSize: 15, lineHeight: 21, fontWeight: '700' }, wellness: { backgroundColor: Colors.careBadge, padding: 18, borderRadius: 22 }, wellnessIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, logs: { gap: 12 }, insight: { backgroundColor: Colors.carePale, padding: 22, borderRadius: 26, gap: 14 },
});
