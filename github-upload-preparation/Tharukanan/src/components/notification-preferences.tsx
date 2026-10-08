import { useRef, useState } from 'react';
import { Platform, Switch, View } from 'react-native';
import { AppText } from '@/components/text';
import { StudentCard, studentStyles } from '@/components/student-ui';
import { StatusMessage } from '@/components/student-screen';
import { Colors } from '@/constants/colors';
import { setAppointmentRemindersEnabled, type UserProfile } from '@/services/user-profile';
import { requestReminderPermission } from '@/services/reminder-notifications';
import { getAuthErrorMessage } from '@/utils/auth';

export function NotificationPreferences({ profile }: { profile: UserProfile }) {
  const [enabled, setEnabled] = useState(profile.appointmentRemindersEnabled === true);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const lock = useRef(false);
  async function change(next: boolean) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const permission = next && Platform.OS !== 'web' ? await requestReminderPermission() : true;
      await setAppointmentRemindersEnabled(next, profile.uid);
      setEnabled(next);
      setNotice(next && !permission ? 'Preference saved. Device permission is off, so reminders appear in-app only.' : 'Reminder preference saved.');
    } catch (err) { console.error('Save appointment reminder preference', err); setError(getAuthErrorMessage(err)); }
    finally { lock.current = false; setBusy(false); }
  }
  return <StudentCard><View style={studentStyles.row}><View style={studentStyles.flex}><AppText style={studentStyles.section}>Appointment reminders</AppText><AppText style={studentStyles.muted}>24 hours, 1 hour before, and when your session starts.</AppText></View><Switch accessibilityLabel="Appointment reminders" value={enabled} disabled={busy} onValueChange={change} trackColor={{ false: Colors.careBorder, true: Colors.careAccent }} thumbColor={Colors.surface} /></View><AppText variant="caption" style={studentStyles.muted}>{Platform.OS === 'web' ? 'Web reminders appear while MindEase is open. Background web notifications are not supported.' : 'Local device notifications require permission. In-app reminders remain available while MindEase is open.'}</AppText><StatusMessage message={error} error /><StatusMessage persistent={busy} message={busy ? 'Saving preference...' : notice} /></StudentCard>;
}
