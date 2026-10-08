import { doc, getDoc, runTransaction, serverTimestamp, type Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { assertSession, requireStudentSession } from '@/services/appointments';

export interface PreSessionNote { id: string; studentId: string; appointmentId: string; note: string; createdAt: Timestamp | null; updatedAt: Timestamp | null }
// One note per appointment; its ID equals appointmentId. This avoids duplicate notes.
export async function getPreSessionNote(appointmentId: string): Promise<PreSessionNote | null> {
  const uid = await requireStudentSession();
  const appointment = await getDoc(doc(db, 'appointments', appointmentId));
  if (!appointment.exists() || appointment.data().studentId !== uid) throw new Error('You can only access notes for your own appointment.');
  const result = await getDoc(doc(db, 'pre_session_notes', appointmentId));
  assertSession(uid);
  if (!result.exists()) return null;
  if (result.data().studentId !== uid || result.data().appointmentId !== appointmentId) throw new Error('You can only access your own notes.');
  return { ...result.data(), id: result.id } as PreSessionNote;
}
async function mutateNote(appointmentId: string, operation: 'create' | 'update' | 'delete', raw = '') {
  const uid = await requireStudentSession();
  const text = raw.trim();
  if (operation !== 'delete' && (!text || text.length > 2000)) throw new Error('Enter a note within 2,000 characters, or leave it unsaved.');
  const ref = doc(db, 'pre_session_notes', appointmentId);
  await runTransaction(db, async tx => {
    const appointment = await tx.get(doc(db, 'appointments', appointmentId));
    const existing = await tx.get(ref);
    if (!appointment.exists() || appointment.data().studentId !== uid) throw new Error('You can only change notes for your own appointment.');
    if (existing.exists() && existing.data().studentId !== uid) throw new Error('You can only change your own notes.');
    assertSession(uid);
    if (operation === 'create') {
      if (existing.exists()) throw new Error('A note already exists. Edit it instead.');
      tx.set(ref, { studentId: uid, appointmentId, note: text, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    } else {
      if (!existing.exists()) throw new Error('This note no longer exists.');
      if (operation === 'delete') tx.delete(ref);
      else tx.update(ref, { note: text, updatedAt: serverTimestamp() });
    }
  });
}
export function createPreSessionNote(appointmentId: string, note: string) { return mutateNote(appointmentId, 'create', note); }
export function updatePreSessionNote(appointmentId: string, note: string) { return mutateNote(appointmentId, 'update', note); }
export function deletePreSessionNote(appointmentId: string) { return mutateNote(appointmentId, 'delete'); }
