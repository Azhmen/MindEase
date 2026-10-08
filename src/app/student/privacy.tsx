import { useRouter } from 'expo-router';
import { AppText } from '@/components/text';
import { StudentScreen } from '@/components/student-screen';
import { CareButton, StudentCard, studentStyles } from '@/components/student-ui';
const sections = [
  { title: 'Your student account', text: 'MindEase stores your name, email and role, optional profile details and reminder preference. Your check-ins, reflections, saved resources, appointments, pre-session notes and chat messages are stored to support these features. Passwords are handled by Firebase Authentication and are not stored in your Firestore profile.' },
  { title: 'Anonymous mode', text: 'Anonymous mode does not collect your name, email or student ID. A system-generated Firebase UID is used only to securely isolate anonymous session data. Anonymous mood and chat records are separate from student records. They are not automatically linked or migrated into a student account.' },
  { title: 'Role-based access', text: 'Firestore rules restrict private student records to their owner. Assigned counselors can read their own sessions and linked pre-session notes, and access assigned conversations. Counselors can update session status but cannot edit your pre-session note or private mood and saved-resource records.' },
  { title: 'Appointments and chat', text: 'Access depends on your signed-in account and the appointment or chat assignment. Message editing and deletion are limited to the sender. Counselor directory information is public to signed-in users; private profile details are not placed in that directory.' },
  { title: 'Your device and privacy', text: 'Keep shared devices secure and log out when finished. Reminder notifications may appear on your device, depending on permissions and settings. Contact your institution for its data retention and privacy policies; no institution-specific policy is configured in this app.' },
];
export default function StudentPrivacyRoute() {
  const router = useRouter();
  return <StudentScreen title="Privacy & Data Information"><AppText style={studentStyles.muted}>Understand what MindEase stores and who can access it.</AppText>{sections.map(section => <StudentCard key={section.title}><AppText style={studentStyles.section}>{section.title}</AppText><AppText style={studentStyles.muted}>{section.text}</AppText></StudentCard>)}<CareButton title="Back to Profile" secondary onPress={() => router.replace('/student/profile')} /></StudentScreen>;
}
