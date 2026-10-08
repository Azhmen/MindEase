import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/text';
import { AppTextInput } from '@/components/app-text-input';
import { CareIcon } from '@/components/care-icon';
import { StudentScreen } from '@/components/student-screen';
import { CareButton, StudentCard, studentStyles } from '@/components/student-ui';
import { Colors } from '@/constants/colors';
import { filterStudentSupport, studentFaq, studentGuide } from '@/constants/student-support';

export default function StudentSupportRoute() {
  const router = useRouter();
  const [search, setSearch] = useState(''), [category, setCategory] = useState(''), [expanded, setExpanded] = useState('');
  const visible = filterStudentSupport(search, category);
  return <StudentScreen title="Support Options" eyebrow="CAMPUS WELLNESS NETWORK">
    <AppText style={studentStyles.muted}>Find the right kind of help, guidance, or campus support.</AppText>
    <AppTextInput accessibilityLabel="Search support options" placeholder="Search help, guides and support..." value={search} onChangeText={setSearch} autoCapitalize="none" />
    <AppText style={studentStyles.label}>TRENDING TOPICS</AppText>
    <View style={styles.chips}>{['Urgent Help', 'Wellbeing', 'Account Access', 'Getting Started'].map(topic => <Pressable key={topic} accessibilityRole="button" accessibilityState={{ selected: topic === category }} onPress={() => setCategory(current => current === topic ? '' : topic)} style={[styles.chip, category === topic && styles.selected]}><AppText style={{ color: category === topic ? Colors.onPrimary : Colors.careGreen }}>{topic}</AppText></Pressable>)}</View>
    {visible.map(option => {
      const open = expanded === option.id;
      return <StudentCard key={option.id}>
        <Pressable accessibilityRole="button" accessibilityLabel={option.title} accessibilityState={'route' in option ? undefined : { expanded: open }} onPress={() => { if ('route' in option) router.push(option.route); else setExpanded(open ? '' : option.id); }} style={studentStyles.row}>
          <View style={[styles.icon, option.id === 'crisis' && styles.alert]}><CareIcon name={option.icon} size={24} /></View><View style={studentStyles.flex}><AppText style={styles.title}>{option.title}</AppText><AppText style={styles.description}>{option.description}</AppText></View><CareIcon name="arrow" size={18} />
        </Pressable>
        {open && 'detail' in option ? <AppText style={styles.detail}>{option.detail}</AppText> : null}
        {open && ['guide', 'faq'].includes(option.id) ? (option.id === 'guide' ? studentGuide : studentFaq).map(section => <View key={section.title} style={styles.section}><AppText style={styles.title}>{section.title}</AppText><AppText style={styles.detail}>{section.description}</AppText></View>) : null}
        {open && option.id === 'faq' ? <CareButton title="Open Crisis Support" secondary onPress={() => router.push('/student/crisis-support')} /> : null}
      </StudentCard>;
    })}
    {!visible.length ? <StudentCard><CareIcon name="book" size={28} /><AppText style={studentStyles.section}>No support options found</AppText><AppText style={studentStyles.muted}>Try another search or clear the topic filter.</AppText></StudentCard> : null}
    {search || category ? <CareButton title="Clear Search & Filters" secondary onPress={() => { setSearch(''); setCategory(''); }} /> : null}
    <CareButton title="Privacy & Data Information" secondary onPress={() => router.push('/student/privacy')} />
    <AppText style={styles.detail}>MindEase does not replace professional care or emergency services.</AppText>
  </StudentScreen>;
}
const styles = StyleSheet.create({ chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.carePale, borderWidth: 1, borderColor: Colors.careBorder }, selected: { backgroundColor: Colors.careGreen }, icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.carePale, alignItems: 'center', justifyContent: 'center' }, alert: { backgroundColor: Colors.careAlert }, title: { color: Colors.careGreen, fontSize: 16, fontWeight: '600', lineHeight: 22 }, description: { color: Colors.careMuted, fontSize: 14, lineHeight: 22 }, detail: { color: Colors.careMuted, fontSize: 14, lineHeight: 22 }, section: { borderTopWidth: 1, borderColor: Colors.careBorder, paddingTop: 12, gap: 6 } });
