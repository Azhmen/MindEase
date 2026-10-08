import { StyleSheet, View } from 'react-native';
import { CareIcon } from '@/components/care-icon';
import { AppText } from '@/components/text';
import { StudentCard, studentStyles } from '@/components/student-ui';
import { Colors } from '@/constants/colors';

// Informational content shared across student, guest, and counselor shells.
export function CrisisSupportContent() {
  return <>
    <AppText style={studentStyles.muted}>You do not have to face this alone. Your safety comes first.</AppText>
    <StudentCard style={{ backgroundColor: Colors.careGreen, borderColor: Colors.careGreen, padding: 20, gap: 16, borderRadius: 22 }}>
      <View style={studentStyles.row}><CareIcon name="shield" size={26} color={Colors.onPrimary} /><AppText variant="title" style={{ color: Colors.onPrimary }}>Need help right now?</AppText></View>
      <AppText style={{ color: Colors.onPrimary, fontSize: 14 }}>If you are in immediate danger or unable to stay safe, contact the appropriate local emergency service or go to the nearest emergency department. If possible, stay with someone you trust.</AppText>
    </StudentCard>
    <StudentCard style={styles.campus}><View style={styles.heading}><CareIcon name="leaf" size={28} /><AppText style={[studentStyles.section, { flex: 1 }]}>Campus Crisis Support</AppText></View><AppText style={{ fontSize: 14 }}>Contact your campus wellbeing or student support service.</AppText><AppText variant="caption" style={studentStyles.muted}>Verified campus contact details and opening hours will be added here.</AppText></StudentCard>
    <StudentCard style={styles.trusted}><View style={styles.heading}><CareIcon name="heart" size={28} /><AppText style={[studentStyles.section, { flex: 1 }]}>Trusted Contact</AppText></View><AppText style={{ fontSize: 14 }}>Reach out to someone you trust. You could say: “I am having a difficult time and need someone to stay with me.”</AppText><AppText variant="caption" style={studentStyles.muted}>Use your phone to contact a trusted friend, family member, or lecturer.</AppText></StudentCard>
    <StudentCard style={styles.emergency}><View style={styles.heading}><CareIcon name="shield" size={28} color={Colors.error} /><AppText style={[studentStyles.section, { flex: 1 }]}>Local Emergency Support</AppText></View><AppText style={{ fontSize: 14 }}>If there is an immediate emergency, contact the appropriate local emergency service.</AppText><AppText variant="caption" style={studentStyles.muted}>Local contact details are not yet configured. This screen cannot place calls or request emergency assistance.</AppText></StudentCard>
  </>;
}

const styles = StyleSheet.create({ heading: { flexDirection: 'row', alignItems: 'center', gap: 12 }, campus: { backgroundColor: Colors.carePale, padding: 24, boxShadow: 'none' }, trusted: { backgroundColor: Colors.careLavender, padding: 24, boxShadow: 'none' }, emergency: { backgroundColor: Colors.careAlert, padding: 24, borderLeftWidth: 2, borderColor: Colors.error, boxShadow: 'none' } });
