import { collection, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, where, type Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { requireUserId } from '@/services/student-session';
import { getUserProfile } from '@/services/user-profile';

// Tharukanan owns appointments. Cancellation is a soft delete; no session-status CRUD.
export type SessionFormat = 'Virtual' | 'In-Person';
export type AppointmentStatus = 'booked' | 'rescheduled' | 'cancelled' | 'completed';
export interface Appointment {
  id: string; studentId: string; counselorId: string; counselorName: string;
  appointmentDate: string; appointmentTime: string; sessionFormat: SessionFormat;
  status: AppointmentStatus; createdAt: Timestamp | null; updatedAt: Timestamp | null;
}
export interface BookingDetails {
  counselorId: string; appointmentDate: string; appointmentTime: string; sessionFormat: SessionFormat;
}
export interface BookingCounselor { id: string; name: string; title?: string; specialty?: string }
export async function requireStudentSession() {
  const uid = requireUserId();
  const profile = await getUserProfile(uid);
  if (profile?.role !== 'student') throw new Error('Please sign in with a student account.');
  assertSession(uid);
  return uid;
}
export function assertSession(uid: string) {
  if (requireUserId() !== uid) throw new Error('Your account changed. Please reopen My Appointments.');
}
export function newAppointmentId() { return doc(collection(db, 'appointments')).id; }
export function appointmentStart(entry: Pick<Appointment, 'appointmentDate' | 'appointmentTime'>) {
  return new Date(entry.appointmentDate + 'T' + entry.appointmentTime + ':00');
}
export function validateSchedule(details: Pick<BookingDetails, 'appointmentDate' | 'appointmentTime' | 'sessionFormat'>) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(details.appointmentDate) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(details.appointmentTime)) throw new Error('Choose a valid date and time.');
  const date = appointmentStart(details);
  const [year, month, day] = details.appointmentDate.split('-').map(Number);
  if (!Number.isFinite(date.getTime()) || date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) throw new Error('Choose a valid calendar date.');
  if (date.getTime() <= Date.now()) throw new Error('Choose a future date and time.');
  if (!['Virtual', 'In-Person'].includes(details.sessionFormat)) throw new Error('Select a session format.');
}
export async function getBookingCounselors(): Promise<BookingCounselor[]> {
  const uid = await requireStudentSession();
  const result = await getDocs(collection(db, 'counselor_directory'));
  assertSession(uid);
  return result.docs.flatMap(item => {
    const data = item.data();
    return (data.active === undefined || data.active === true) && typeof data.name === 'string' && data.name.trim()
      ? [{ id: item.id, name: data.name.trim(), title: typeof data.title === 'string' ? data.title : undefined, specialty: typeof data.specialty === 'string' ? data.specialty : undefined }] : [];
  }).sort((a, b) => a.name.localeCompare(b.name));
}
export async function createAppointment(id: string, ownerUid: string, details: BookingDetails, note = '') {
  const uid = await requireStudentSession();
  if (uid !== ownerUid) throw new Error('This booking draft belongs to a previous session. Start again.');
  if (!id || !details.counselorId) throw new Error('Choose a counselor before confirming.');
  validateSchedule(details);
  const text = note.trim();
  if (text.length > 2000) throw new Error('Keep your pre-session note within 2,000 characters.');
  const ref = doc(db, 'appointments', id);
  // Stable draft ID + transaction make double taps / retry after an uncertain save idempotent.
  await runTransaction(db, async tx => {
    const existing = await tx.get(ref);
    if (existing.exists()) {
      if (existing.data().studentId !== uid) throw new Error('You can only access your own appointments.');
      return;
    }
    const directory = await tx.get(doc(db, 'counselor_directory', details.counselorId));
    const counselor = directory.exists() ? directory.data() : null;
    if (!counselor || counselor.active === false || typeof counselor.name !== 'string' || !counselor.name.trim()) throw new Error('This counselor is unavailable. Please choose another counselor.');
    assertSession(uid);
    tx.set(ref, { counselorId: details.counselorId, appointmentDate: details.appointmentDate, appointmentTime: details.appointmentTime, sessionFormat: details.sessionFormat, studentId: uid, counselorName: counselor.name, status: 'booked', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    if (text) tx.set(doc(db, 'pre_session_notes', id), { studentId: uid, appointmentId: id, note: text, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  });
  return id;
}
export async function getAppointment(id: string): Promise<Appointment> {
  const uid = await requireStudentSession();
  const result = await getDoc(doc(db, 'appointments', id));
  assertSession(uid);
  if (!result.exists()) throw new Error('This appointment no longer exists.');
  if (result.data().studentId !== uid) throw new Error('You can only access your own appointments.');
  return { ...result.data(), id: result.id } as Appointment;
}
export async function getAppointmentsForStudent(): Promise<Appointment[]> {
  const uid = await requireStudentSession();
  const result = await getDocs(query(collection(db, 'appointments'), where('studentId', '==', uid)));
  assertSession(uid);
  const entries = result.docs.map(item => ({ ...item.data(), id: item.id }) as Appointment);
  return entries.sort((a, b) => {
    const active = (item: Appointment) => !['cancelled', 'completed'].includes(item.status) && appointmentStart(item).getTime() >= Date.now();
    if (active(a) !== active(b)) return active(a) ? -1 : 1;
    return active(a) ? appointmentStart(a).getTime() - appointmentStart(b).getTime() : appointmentStart(b).getTime() - appointmentStart(a).getTime();
  });
}
async function changeAppointment(id: string, schedule?: Pick<BookingDetails, 'appointmentDate' | 'appointmentTime' | 'sessionFormat'>) {
  const uid = await requireStudentSession();
  if (schedule) validateSchedule(schedule);
  const ref = doc(db, 'appointments', id);
  await runTransaction(db, async tx => {
    const result = await tx.get(ref);
    if (!result.exists() || result.data().studentId !== uid) throw new Error('You can only change your own appointments.');
    if (!['booked', 'rescheduled'].includes(result.data().status)) throw new Error('Cancelled or completed appointments cannot be changed.');
    if (appointmentStart(result.data() as Appointment).getTime() <= Date.now()) throw new Error('Past appointments cannot be changed.');
    assertSession(uid);
    tx.update(ref, { ...(schedule ? { appointmentDate: schedule.appointmentDate, appointmentTime: schedule.appointmentTime, sessionFormat: schedule.sessionFormat } : {}), status: schedule ? 'rescheduled' : 'cancelled', updatedAt: serverTimestamp() });
  });
}
export function updateAppointment(id: string, schedule: Pick<BookingDetails, 'appointmentDate' | 'appointmentTime' | 'sessionFormat'>) { return changeAppointment(id, schedule); }
export function cancelAppointment(id: string) { return changeAppointment(id); }
