import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { getAppointment, getAppointmentsForStudent } from '@/services/appointments';
import { getUserProfile } from '@/services/user-profile';
import { buildAppointmentReminderPlan, formattedAppointmentSchedule, type AppointmentReminder, type ReminderAppointment } from '@/utils/appointment-reminder-plan';
import { cancelNativeReminders, getNativeReminderIds, reconcileNativeReminders, showImmediateNotification } from '@/services/reminder-notifications';

export type ReminderDelivery = 'native' | 'permission-denied' | 'in-app';
export interface ReminderTracking {
  confirmationSent: boolean;
  confirmationDelivery?: ReminderDelivery;
  reminder24hScheduled: boolean;
  reminder1hScheduled: boolean;
  sessionStartScheduled: boolean;
}
export interface AppointmentNotice { title: string; body: string; appointmentId: string; at: number }
export interface ReminderSnapshot {
  uid: string; plan: AppointmentReminder[]; enabled: boolean | null; delivery: ReminderDelivery;
  statuses: Record<string, ReminderTracking>; event: AppointmentNotice | null; error: string;
}
export const emptyReminderSnapshot: ReminderSnapshot = { uid: '', plan: [], enabled: null, delivery: 'in-app', statuses: {}, event: null, error: '' };
const key = (uid: string) => `mindease_appointment_reminders:${uid}`;
const trackingKey = (uid: string) => `mindease_appointment_reminder_status:${uid}`;
const listeners = new Map<(state: ReminderSnapshot) => void, string>();
let snapshot = emptyReminderSnapshot;
let pending: Promise<unknown> = Promise.resolve();
function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = pending.then(operation); pending = result.catch(() => {}); return result;
}
function assertOwner(uid: string) {
  if (!auth.currentUser || auth.currentUser.isAnonymous || auth.currentUser.uid !== uid) throw new Error('Your account changed. Reopen MindEase to refresh reminders.');
}
function publish(next: ReminderSnapshot) {
  if (auth.currentUser?.uid !== next.uid) return;
  snapshot = next;
  listeners.forEach((uid, listener) => { if (uid === next.uid) listener(next); });
}
export function subscribeAppointmentReminderState(uid: string, listener: (state: ReminderSnapshot) => void) {
  listeners.set(listener, uid);
  listener(snapshot.uid === uid ? snapshot : { ...emptyReminderSnapshot, uid });
  return () => { listeners.delete(listener); };
}
async function readTracking(uid: string): Promise<Record<string, ReminderTracking>> {
  const raw = await AsyncStorage.getItem(trackingKey(uid));
  return raw ? JSON.parse(raw) : {};
}
async function reconcile(entries: ReminderAppointment[], enabled: boolean, uid: string) {
  assertOwner(uid);
  const statuses = await readTracking(uid);
  const plan = buildAppointmentReminderPlan(entries, uid, enabled);
  const delivery = await reconcileNativeReminders(uid, plan);
  const nativeIds = await getNativeReminderIds(uid);
  const now = Date.now();
  for (const id of new Set([...Object.keys(statuses), ...entries.filter(entry => entry.studentId === uid).map(entry => entry.id)])) {
    const queued = (offset: 24 | 1 | 0) => plan.some(item => item.appointmentId === id && item.hoursBefore === offset && item.fireAt > now && (delivery !== 'native' || nativeIds.includes(item.id)));
    statuses[id] = { confirmationSent: statuses[id]?.confirmationSent === true, confirmationDelivery: statuses[id]?.confirmationDelivery, reminder24hScheduled: queued(24), reminder1hScheduled: queued(1), sessionStartScheduled: queued(0) };
  }
  // Persist identifiers/times/status only; names and notification bodies stay out of tracking.
  await AsyncStorage.setItem(key(uid), JSON.stringify(plan.map(item => ({ id: item.id, appointmentId: item.appointmentId, appointmentAt: item.appointmentAt, fireAt: item.fireAt, hoursBefore: item.hoursBefore }))));
  await AsyncStorage.setItem(trackingKey(uid), JSON.stringify(statuses));
  if (auth.currentUser?.uid !== uid) { await cancelNativeReminders(uid); await AsyncStorage.removeItem(key(uid)); throw new Error('Your reminder session ended.'); }
  const event = snapshot.uid === uid ? snapshot.event : null;
  const next: ReminderSnapshot = { uid, plan, enabled, delivery, statuses, event, error: delivery === 'permission-denied' ? event?.title === 'Appointment Confirmed' ? 'Appointment booked. Enable notifications in your device settings to receive reminders.' : 'Device notification permission is off. Reminders are shown in-app only.' : '' };
  publish(next);
  return next;
}
export function scheduleAppointmentReminders(entries: ReminderAppointment[], enabled: boolean, expectedUid: string) {
  return serialize(() => reconcile(entries, enabled, expectedUid));
}
export const rescheduleAppointmentReminders = scheduleAppointmentReminders;
export function cancelAppointmentReminders(uid: string) {
  return serialize(async () => {
    await cancelNativeReminders(uid); await AsyncStorage.removeItem(key(uid));
    const statuses = await readTracking(uid);
    Object.values(statuses).forEach(status => { status.reminder24hScheduled = false; status.reminder1hScheduled = false; status.sessionStartScheduled = false; });
    await AsyncStorage.setItem(trackingKey(uid), JSON.stringify(statuses));
    if (snapshot.uid === uid) publish({ ...snapshot, plan: [], statuses, event: null });
  });
}

// Runs only AFTER successful CRUD. Never writes to appointments or notes.
export async function handleAppointmentReminderEvent(id: string, kind: 'confirmed' | 'rescheduled' | 'cancelled') {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  try {
    await serialize(async () => {
      assertOwner(uid);
      const [entry, entries, profile] = await Promise.all([getAppointment(id), getAppointmentsForStudent(), getUserProfile(uid)]);
      assertOwner(uid);
      const statuses = await readTracking(uid);
      const matchesStatus = entry.status === (kind === 'confirmed' ? 'booked' : kind);
      if (matchesStatus && (kind !== 'confirmed' || !statuses[id]?.confirmationSent)) {
        const title = kind === 'confirmed' ? 'Appointment Confirmed' : kind === 'rescheduled' ? 'Appointment Rescheduled' : 'Appointment Cancelled';
        const formatted = formattedAppointmentSchedule(entry.appointmentDate, entry.appointmentTime);
        const counselor = entry.counselorName ? ` with ${entry.counselorName}` : '';
        const body = kind === 'cancelled' ? `Your appointment on ${formatted.date} at ${formatted.time} has been cancelled.` : kind === 'rescheduled' ? `Your appointment${counselor} is now scheduled for ${formatted.date} at ${formatted.time}.` : `You have an appointment${counselor} on ${formatted.date} at ${formatted.time}.`;
        const event = { title, body, appointmentId: id, at: Date.now() };
        publish({ ...(snapshot.uid === uid ? snapshot : emptyReminderSnapshot), uid, event });
        // Remove obsolete triggers before an OS permission prompt can delay cancel/reschedule.
        if (kind !== 'confirmed') await reconcile(entries, profile?.appointmentRemindersEnabled === true, uid);
        let delivery: ReminderDelivery = 'in-app';
        try { delivery = await showImmediateNotification(`mindease-event:${uid}:${id}:${kind}`, title, body, () => auth.currentUser?.uid === uid && !auth.currentUser.isAnonymous); }
        catch (error) { console.error('Appointment notification', error); }
        assertOwner(uid);
        // Restart the in-app feedback lifetime after a permission prompt resolves.
        publish({ ...(snapshot.uid === uid ? snapshot : emptyReminderSnapshot), uid, event: { ...event, at: Date.now() } });
        if (kind === 'confirmed') {
          statuses[id] = { confirmationSent: true, confirmationDelivery: delivery, reminder24hScheduled: false, reminder1hScheduled: false, sessionStartScheduled: false };
          await AsyncStorage.setItem(trackingKey(uid), JSON.stringify(statuses));
        }
      }
      await reconcile(entries, profile?.appointmentRemindersEnabled === true, uid);
    });
  } catch (error) {
    // A reminder failure must not turn a saved appointment into a failed booking/retry.
    console.error('Appointment reminder update', error);
    publish({ ...(snapshot.uid === uid ? snapshot : emptyReminderSnapshot), uid, statuses: {}, error: 'Your appointment was saved, but reminder status could not be updated. Reopen MindEase to retry.' });
  }
}
export async function sendTestAppointmentReminder(id: string) {
  if (!__DEV__) return;
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await serialize(async () => {
    assertOwner(uid); await getAppointment(id); assertOwner(uid);
    const event = { title: 'MindEase test reminder', body: 'This is a development test notification.', appointmentId: id, at: Date.now() };
    publish({ ...(snapshot.uid === uid ? snapshot : emptyReminderSnapshot), uid, event });
    await showImmediateNotification(`mindease-test:${uid}:${Date.now()}`, event.title, event.body, () => auth.currentUser?.uid === uid && !auth.currentUser.isAnonymous);
  });
}
export function subscribeToAppointmentReminderInputs(uid: string, onChange: (entries: ReminderAppointment[], enabled: boolean) => void, onError: (error: Error) => void) {
  let entries: ReminderAppointment[] | undefined, enabled: boolean | undefined;
  function emit() { if (entries !== undefined && enabled !== undefined) onChange(entries, enabled); }
  const stopProfile = onSnapshot(doc(db, 'users', uid), snapshot => {
    if (!snapshot.exists() || snapshot.data().role !== 'student') { onError(new Error('Student reminder settings could not be loaded.')); return; }
    enabled = snapshot.data().appointmentRemindersEnabled === true; emit();
  }, onError);
  const stopAppointments = onSnapshot(query(collection(db, 'appointments'), where('studentId', '==', uid)), snapshot => { entries = snapshot.docs.map(item => ({ ...item.data(), id: item.id }) as ReminderAppointment); emit(); }, onError);
  return () => { stopProfile(); stopAppointments(); };
}
export type { AppointmentReminder };
