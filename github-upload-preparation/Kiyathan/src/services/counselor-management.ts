import { collection, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, where, type Timestamp } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { requireUserId } from '@/services/student-session';
import { getUserProfile } from '@/services/user-profile';
import type { Appointment, BookingDetails } from '@/services/appointments';

export interface AvailabilitySlot {
  id: string; counselorId: string; date: string; startTime: string; endTime: string;
  mode: 'virtual' | 'in_person'; location: string; isAvailable: boolean;
  createdAt: Timestamp | null; updatedAt: Timestamp | null;
}
export type AvailabilityInput = Pick<AvailabilitySlot, 'date' | 'startTime' | 'endTime' | 'mode' | 'location' | 'isAvailable'>;
async function counselorUid() {
  const uid = requireUserId();
  if ((await getUserProfile(uid))?.role !== 'counselor') throw new Error('Please sign in with a counselor account.');
  assertSession(uid); return uid;
}
function assertSession(uid: string) { if (requireUserId() !== uid) throw new Error('Your session changed. Please try again.'); }
export function validateAvailability(input: AvailabilityInput): AvailabilityInput {
  const { date, startTime, endTime, mode, isAvailable } = input;
  const parsed = new Date(date + 'T12:00:00');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.getFullYear() !== Number(date.slice(0, 4)) || parsed.getMonth() + 1 !== Number(date.slice(5, 7)) || parsed.getDate() !== Number(date.slice(8))) throw new Error('Enter a valid date (YYYY-MM-DD).');
  if (![startTime, endTime].every(time => /^([01]\d|2[0-3]):[0-5]\d$/.test(time))) throw new Error('Enter start and end times in HH:mm format.');
  if (endTime <= startTime) throw new Error('End time must be after start time.');
  if (!['virtual', 'in_person'].includes(mode)) throw new Error('Select a session mode.');
  const location = mode === 'in_person' ? input.location.trim() : '';
  if (mode === 'in_person' && !location) throw new Error('Enter an in-person location.');
  if (location.length > 200 || typeof isAvailable !== 'boolean') throw new Error('Check the location and availability status.');
  return { date, startTime, endTime, mode, location, isAvailable };
}
export async function createAvailabilitySlot(input: AvailabilityInput) {
  const uid = await counselorUid(), data = validateAvailability(input), ref = doc(collection(db, 'counselor_availability'));
  await runTransaction(db, async tx => { assertSession(uid); tx.set(ref, { ...data, counselorId: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); });
  return ref.id;
}
export async function getOwnAvailability() {
  const uid = await counselorUid();
  const result = await getDocs(query(collection(db, 'counselor_availability'), where('counselorId', '==', uid)));
  assertSession(uid);
  return result.docs.map(item => ({ ...item.data(), id: item.id } as AvailabilitySlot)).sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
}
export async function getAvailabilitySlot(id: string) {
  const uid = await counselorUid(), result = await getDoc(doc(db, 'counselor_availability', id));
  assertSession(uid);
  if (!result.exists() || result.data().counselorId !== uid) throw new Error('You can only access your own availability slots.');
  return { ...result.data(), id } as AvailabilitySlot;
}
async function changeAvailability(id: string, input?: AvailabilityInput) {
  const uid = await counselorUid(), data = input ? validateAvailability(input) : null;
  const ref = doc(db, 'counselor_availability', id);
  await runTransaction(db, async tx => {
    const result = await tx.get(ref);
    if (!result.exists() || result.data().counselorId !== uid) throw new Error('You can only change your own availability slots.');
    assertSession(uid);
    if (data) tx.update(ref, { ...data, updatedAt: serverTimestamp() }); else tx.delete(ref);
  });
}
export function updateAvailabilitySlot(id: string, input: AvailabilityInput) { return changeAvailability(id, input); }
export async function deleteAvailabilitySlot(id: string, expectedCounselorId?: string) {
  const ownershipMessage = 'You can only delete your own availability slots.';
  const uid = auth.currentUser?.uid;
  if (!uid || (expectedCounselorId !== undefined && expectedCounselorId !== uid)) {
    throw new Error(ownershipMessage);
  }
  try {
    await counselorUid();
    const ref = doc(db, 'counselor_availability', id);
    await runTransaction(db, async tx => {
      const snapshot = await tx.get(ref);
      if (auth.currentUser?.uid !== uid || (snapshot.exists() && snapshot.data().counselorId !== uid)) {
        throw new Error(ownershipMessage);
      }
      // A slot already removed by its owner needs no further write.
      if (snapshot.exists()) tx.delete(ref);
    });
  } catch (error) {
    if (__DEV__) {
      const details = error as { code?: string; message?: string } | null;
      console.error('Availability delete failed', { code: details?.code, message: details?.message }, error);
    }
    if (error instanceof Error && error.message === ownershipMessage) throw error;
    throw new Error('Unable to delete this availability slot.');
  }
}
// Student read-only integration; booking ownership and reservation remain separate.
export async function getAvailableSlotsForBooking(counselorId: string) {
  const uid = requireUserId();
  if ((await getUserProfile(uid))?.role !== 'student') throw new Error('Please sign in with a student account.');
  // Single equality query avoids a composite index; filter counselor/date locally.
  const result = await getDocs(query(collection(db, 'counselor_availability'), where('isAvailable', '==', true)));
  assertSession(uid);
  return result.docs.map(item => ({ ...item.data(), id: item.id } as AvailabilitySlot))
    .filter(slot => slot.counselorId === counselorId && new Date(slot.date + 'T' + slot.startTime + ':00').getTime() > Date.now())
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
}
export async function assertAvailableBooking(details: BookingDetails) {
  const slots = await getAvailableSlotsForBooking(details.counselorId);
  if (!slots.some(slot => slot.date === details.appointmentDate && slot.startTime === details.appointmentTime && slot.mode === (details.sessionFormat === 'Virtual' ? 'virtual' : 'in_person'))) throw new Error('This slot is no longer available. Please choose another time.');
}
export async function getCounselorSessions() {
  const uid = await counselorUid();
  const result = await getDocs(query(collection(db, 'appointments'), where('counselorId', '==', uid)));
  assertSession(uid);
  return result.docs.map(item => ({ ...item.data(), id: item.id } as Appointment)).sort((a, b) => (a.appointmentDate + a.appointmentTime).localeCompare(b.appointmentDate + b.appointmentTime));
}
export async function getCounselorSession(id: string) {
  const uid = await counselorUid(), result = await getDoc(doc(db, 'appointments', id));
  assertSession(uid);
  if (!result.exists() || result.data().counselorId !== uid) throw new Error('You can only access sessions assigned to you.');
  return { ...result.data(), id } as Appointment;
}
export async function getSessionPreSessionNote(id: string) {
  const uid = await counselorUid(), session = await getCounselorSession(id);
  assertSession(uid);
  const result = await getDoc(doc(db, 'pre_session_notes', id));
  assertSession(uid);
  if (!result.exists()) return null;
  if (result.data().appointmentId !== id || result.data().studentId !== session.studentId) throw new Error('This note does not belong to this session.');
  return result.data().note as string;
}
// Kiyathan updates status only; no appointment creation/rescheduling/deletion or note writes.
export async function updateSessionStatus(id: string, status: 'completed' | 'cancelled') {
  const uid = await counselorUid(), ref = doc(db, 'appointments', id);
  if (!['completed', 'cancelled'].includes(status)) throw new Error('Select a supported session status.');
  await runTransaction(db, async tx => {
    const result = await tx.get(ref);
    if (!result.exists() || result.data().counselorId !== uid) throw new Error('You can only update sessions assigned to you.');
    if (!['booked', 'rescheduled'].includes(result.data().status)) throw new Error('This session is already completed or cancelled.');
    assertSession(uid); tx.update(ref, { status, updatedAt: serverTimestamp() });
  });
}
