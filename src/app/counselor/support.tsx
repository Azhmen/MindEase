import { Typography } from '@/constants/typography';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CounselorFrame, CounselorHeader } from '@/components/counselor-ui';
import { AppText } from '@/components/text';
import { AppTextInput } from '@/components/app-text-input';
import { CareIcon } from '@/components/care-icon';
import { CareButton, studentStyles } from '@/components/student-ui';
import { Colors } from '@/constants/colors';

// Supporting information only. Scheduling/session CRUD remains Kiyathan's.
const options = [
  { id: 'technical', title: 'Technical Support', icon: 'shield', description: 'Help with access, connection and platform issues.', topics: ['Account Access', 'Live Chat'], detail: 'Check your internet connection and try reopening the screen. For account or access issues, contact your institution through its approved support channel. Never share your password or private student conversations.' },
  { id: 'guide', title: 'Platform Guide', icon: 'book', description: 'Find your way around your counselor workspace.', topics: ['Scheduling', 'Live Chat'], detail: 'Use Schedule to manage your availability. Open Sessions from the dashboard to view assigned appointments and update their status. Messages opens your assigned student conversations.' },
  { id: 'resources', title: 'Counseling Resources', icon: 'leaf', description: 'Practical reminders for safe, supportive campus care.', topics: ['Privacy'], detail: 'Follow your campus policies for confidentiality, safeguarding and referral. Share only the information needed for care through approved channels. Use verified campus guidance when a student needs urgent support.' },
  { id: 'admin', title: 'Contact Admin', icon: 'chat', description: 'Find the right channel for campus platform assistance.', topics: ['Account Access', 'Scheduling'], detail: 'Contact your institution’s designated MindEase administrator using an approved campus channel. Administrator contact details have not been configured here yet.' },
  { id: 'faq', title: 'FAQ', icon: 'portal', description: 'Quick answers to common counselor questions.', topics: ['Account Access', 'Scheduling', 'Live Chat', 'Privacy'], detail: 'Who appears in Messages? Only students and anonymous conversations assigned to you.\n\nCan I change a student’s pre-session note? No. Assigned notes are read-only.\n\nDoes selecting a booking time reserve a slot? Not yet. Confirm arrangements through campus support.\n\nWhere do I manage availability? Open Schedule in the bottom navigation.' },
] as const;
const trending = ['Account Access', 'Scheduling', 'Live Chat', 'Privacy'];

export default function CounselorSupportRoute() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [topic, setTopic] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const query = search.trim().toLowerCase();
  const visible = options.filter(option =>
    (!topic || option.topics.some(item => item === topic)) &&
    (!query || [option.title, option.description, option.detail, ...option.topics].join(' ').toLowerCase().includes(query)));

  return <CounselorFrame>
    <CounselorHeader backTo="/counselor/dashboard" />
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.badge}><CareIcon name="leaf" size={13} /><AppText style={styles.badgeText}>Campus Wellness Network</AppText></View>
      <View style={styles.intro}><AppText style={styles.heading}>Support Options</AppText><AppText style={styles.subtitle}>A little guidance, whenever you need it.</AppText></View>
      <AppTextInput accessibilityLabel="Search support options" placeholder="Search help, guides and support..." value={search} onChangeText={setSearch} autoCapitalize="none" returnKeyType="search" style={styles.search} />
      <View style={styles.topics}><AppText style={styles.eyebrow}>TRENDING TOPICS</AppText><View style={styles.chips}>{trending.map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: topic === item }} onPress={() => setTopic(current => current === item ? '' : item)} style={[styles.chip, topic === item && styles.selectedChip]}><AppText style={[styles.chipText, topic === item && styles.selectedText]}>{item}</AppText></Pressable>)}</View></View>
      <View style={styles.cards}>{visible.map(option => {
        const open = expanded === option.id;
        return <View key={option.id} style={styles.card}>
          <Pressable accessibilityRole="button" accessibilityLabel={option.title} accessibilityState={{ expanded: open }} onPress={() => setExpanded(open ? null : option.id)} style={styles.cardRow}>
            <View style={[styles.icon, ['technical', 'admin'].includes(option.id) && styles.blueIcon]}><CareIcon name={option.icon} size={23} /></View>
            <View style={studentStyles.flex}><AppText style={styles.cardTitle}>{option.title}</AppText><AppText style={styles.description}>{option.description}</AppText></View>
            <View style={open && styles.openArrow}><CareIcon name="arrow" size={16} color={Colors.careMuted} /></View>
          </Pressable>
          {open ? <View style={styles.detail}><AppText style={styles.detailText}>{option.detail}</AppText>{option.id === 'resources' ? <CareButton title="Crisis Support Information" secondary onPress={() => router.push('/counselor/crisis-support')} /> : null}</View> : null}
        </View>;
      })}</View>
      {!visible.length ? <View style={styles.empty}><CareIcon name="book" size={28} /><AppText style={styles.cardTitle}>No support options found</AppText><AppText style={styles.subtitle}>Try a different search or topic.</AppText></View> : null}
      {search || topic ? <CareButton title="Clear Search & Filters" secondary onPress={() => { setSearch(''); setTopic(''); }} /> : null}
      <AppText style={styles.footer}>MindEase · Here to support your campus care.</AppText>
    </ScrollView>
  </CounselorFrame>;
}

const styles = StyleSheet.create({
  scroll: { flex: 1, minHeight: 0 },
  content: { padding: 20, paddingBottom: 24, gap: 20 },
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: Colors.carePale, borderRadius: 20 },
  badgeText: { color: Colors.careGreen, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  intro: { gap: 7 },
  heading: { color: Colors.careGreen, fontFamily: Typography.fontFamily.editorial, fontSize: 28, lineHeight: 36, fontWeight: '700' },
  subtitle: { color: Colors.careMuted, fontSize: 14, lineHeight: 22 },
  search: { backgroundColor: Colors.surface, borderColor: Colors.careBorder, borderRadius: 16, fontSize: 12, minHeight: 48 },
  topics: { gap: 10 },
  eyebrow: { color: Colors.careMuted, fontSize: 12, lineHeight: 18, fontWeight: '600', letterSpacing: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20, backgroundColor: Colors.careInput, borderWidth: 1, borderColor: Colors.careBorder },
  selectedChip: { backgroundColor: Colors.careGreen, borderColor: Colors.careGreen },
  chipText: { color: Colors.careMuted, fontSize: 12, lineHeight: 18 },
  selectedText: { color: Colors.onPrimary },
  cards: { gap: 12 },
  card: { borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 0, borderColor: Colors.careBorder, boxShadow: '0 2px 8px ' + Colors.careShadow },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20 },
  icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.carePale, alignItems: 'center', justifyContent: 'center' },
  blueIcon: { backgroundColor: Colors.careBadge },
  cardTitle: { color: Colors.careGreen, fontSize: 16, lineHeight: 24, fontWeight: '600' },
  description: { color: Colors.careMuted, fontSize: 14, lineHeight: 21, marginTop: 4 },
  openArrow: { transform: [{ rotate: '90deg' }] },
  detail: { marginHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderColor: Colors.careBorder, gap: 12 },
  detailText: { color: Colors.careMuted, fontSize: 14, lineHeight: 23 },
  empty: { alignItems: 'center', gap: 10, padding: 24, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.careBorder },
  footer: { color: Colors.careMuted, textAlign: 'center', fontSize: 12, lineHeight: 16, paddingVertical: 6 },
});
