import { SUCCESS_MESSAGE_DURATION } from '@/hooks/use-temporary-feedback';
import { createContext, useContext } from 'react';
import { useRouter } from 'expo-router';
import { CareButton, StudentCard, studentStyles } from '@/components/student-ui';
import { AppText } from '@/components/text';
import { dueAppointmentReminder, reminderContent } from '@/utils/appointment-reminder-plan';
import { emptyReminderSnapshot, type ReminderSnapshot } from '@/services/appointment-reminders';
export const ReminderContext = createContext<ReminderSnapshot & { now: number }>({ ...emptyReminderSnapshot, now: 0 });
export function AppointmentReminderBanner() {
  const { plan, error, now, event } = useContext(ReminderContext), router = useRouter();
  const due = dueAppointmentReminder(plan, now);
  const dueNotice = due ? due.hoursBefore === 0 ? reminderContent(due) : { title: 'Appointment reminder', body: `Your appointment starts at ${new Date(due.appointmentAt).toLocaleString()}.` } : null;
  // Cancellation feedback is not an upcoming appointment reminder.
  const notice = event && event.title !== 'Appointment Cancelled' && now - event.at < SUCCESS_MESSAGE_DURATION ? event : dueNotice;
  if (!notice) return null;
  return <>{error ? <StudentCard><AppText accessibilityLiveRegion="polite" style={studentStyles.muted}>{error}</AppText></StudentCard> : null}{notice ? <StudentCard><AppText accessibilityLiveRegion="polite" style={studentStyles.section}>{notice.title}</AppText><AppText style={studentStyles.muted}>{notice.body}</AppText><CareButton title="View My Appointments" secondary onPress={() => router.push('/student/appointments')} /></StudentCard> : null}</>;
}
