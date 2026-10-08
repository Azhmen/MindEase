import { useContext, useState } from 'react';
import { Platform } from 'react-native';
import { ReminderContext } from '@/components/appointment-reminder-banner';
import { AppText } from '@/components/text';
import { CareButton, StudentCard, studentStyles } from '@/components/student-ui';
import type { Appointment } from '@/services/appointments';
import { sendTestAppointmentReminder } from '@/services/appointment-reminders';

export function AppointmentReminderStatus({ entry }: { entry: Appointment }) {
  const { uid, enabled, statuses, delivery, plan, now, error } = useContext(ReminderContext);
  const [testBusy, setTestBusy] = useState(false), [testError, setTestError] = useState('');
  const status = uid === entry.studentId ? statuses[entry.id] : undefined;
  const active = ['booked', 'rescheduled'].includes(entry.status);
  function label(offset: 24 | 1 | 0, scheduled: boolean) {
    if (!active) return 'Cancelled / inactive';
    const reminder = plan.find(item => item.appointmentId === entry.id && item.hoursBefore === offset);
    if (reminder && reminder.fireAt <= now) return 'Time reached; no longer pending';
    if (scheduled) return delivery === 'native' ? 'Scheduled on this device' : 'Planned in-app';
    return 'Not scheduled (time passed or unavailable)';
  }
  return <StudentCard>
    <AppText style={studentStyles.section}>Reminder Status</AppText>
    <AppText style={studentStyles.muted}>Status for this device; scheduling does not guarantee delivery.</AppText>
    {!status || enabled === null ? <AppText>{error ? 'Reminder status unavailable.' : 'Loading reminder status...'}</AppText> : <>
      <AppText>Booking confirmation: {status.confirmationSent ? status.confirmationDelivery === 'native' ? 'Sent to device' : 'Shown in-app' : 'Not recorded on this device'}</AppText>
      {!enabled ? <AppText>Appointment reminders: Disabled</AppText> : <>
        <AppText>24-hour reminder: {label(24, status.reminder24hScheduled)}</AppText>
        <AppText>1-hour reminder: {label(1, status.reminder1hScheduled)}</AppText>
        <AppText>Session-start reminder: {label(0, status.sessionStartScheduled)}</AppText>
      </>}
    </>}
    {Platform.OS === 'web' ? <AppText style={studentStyles.muted}>Background web push is not implemented. In-app reminders appear while MindEase is open.</AppText> : null}
    {__DEV__ ? <CareButton title={testBusy ? 'Sending test...' : 'Send test reminder'} secondary disabled={testBusy}
      onPress={async () => { setTestBusy(true); setTestError(''); try { await sendTestAppointmentReminder(entry.id); } catch { setTestError('Unable to send test reminder.'); } finally { setTestBusy(false); } }} /> : null}
    {testError ? <AppText accessibilityLiveRegion="polite">{testError}</AppText> : null}
  </StudentCard>;
}
