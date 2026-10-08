export interface ReminderAppointment {
  id: string; studentId: string; appointmentDate: string; appointmentTime: string; status: string; counselorName?: string;
}
export interface AppointmentReminder {
  id: string; appointmentId: string; appointmentAt: number; fireAt: number; hoursBefore: 24 | 1 | 0; counselorName?: string;
}
export function buildAppointmentReminderPlan(entries: ReminderAppointment[], uid: string, enabled: boolean, now = Date.now()): AppointmentReminder[] {
  if (!enabled) return [];
  return entries.filter(entry => entry.studentId === uid && ['booked', 'rescheduled'].includes(entry.status)).flatMap(entry => {
    const appointmentAt = new Date(entry.appointmentDate + 'T' + entry.appointmentTime + ':00').getTime();
    if (!Number.isFinite(appointmentAt) || appointmentAt + 5 * 60000 <= now) return [];
    const offsets: (24 | 1 | 0)[] = appointmentAt <= now ? [0] : [24, 1, 0];
    return offsets.map(hoursBefore => ({ id: `mindease:${uid}:${entry.id}:${hoursBefore}`, appointmentId: entry.id, appointmentAt, fireAt: appointmentAt - hoursBefore * 3600000, hoursBefore, counselorName: entry.counselorName }));
  }).filter((item, index, list) => list.findIndex(other => other.id === item.id) === index);
}

export function formattedAppointmentSchedule(date: string, time: string) {
  const local = new Date(`${date}T${time}:00`);
  return { date: local.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }), time: local.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) };
}

export function reminderContent(item: AppointmentReminder) {
  const time = new Date(item.appointmentAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const counselor = item.counselorName ? ` with ${item.counselorName}` : '';
  return item.hoursBefore === 0
    ? { title: 'Your Session Is Starting', body: `Your counseling session${counselor} is scheduled to begin now.` }
    : item.hoursBefore === 24
      ? { title: 'Appointment Tomorrow', body: `You have an appointment${counselor} tomorrow at ${time}.` }
      : { title: 'Appointment in 1 Hour', body: `Your counseling session${counselor} starts at ${time}.` };
}

// Session-start remains visible for five minutes while the app is open. Never schedules in the past.
export function dueAppointmentReminder(plan: AppointmentReminder[], now: number) {
  return plan.filter(item => item.fireAt <= now && (item.hoursBefore === 0 ? now < item.appointmentAt + 5 * 60000 : now < item.appointmentAt))
    .sort((a, b) => b.fireAt - a.fireAt)[0];
}
