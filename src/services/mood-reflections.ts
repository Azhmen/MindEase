import { collection, doc, getDocs, query, runTransaction, serverTimestamp, where, type Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { assertGihaniSession, requireGihaniStudent } from '@/services/gihani-session';

export interface MoodReflection { id: string; userId: string; moodEntryId: string; reflection: string; createdAt: Timestamp | null; updatedAt: Timestamp | null }
// Gihani writes mood_reflections ONLY. Azhmen owns every mood_entries mutation.
// A reflection's ID equals its globally unique mood entry ID, enforcing one per check-in.
export async function getMoodReflectionsForUser(): Promise<MoodReflection[]> {
  const uid = await requireGihaniStudent();
  const result = await getDocs(query(collection(db, 'mood_reflections'), where('userId', '==', uid)));
  assertGihaniSession(uid);
  return result.docs.map(item => ({ ...item.data(), id: item.id }) as MoodReflection);
}
async function mutateReflection(moodEntryId: string, operation: 'create' | 'update' | 'delete', raw = '') {
  const uid = await requireGihaniStudent();
  const reflection = raw.trim();
  if (operation !== 'delete' && (!reflection || reflection.length > 1000)) throw new Error('Write a reflection within 1,000 characters.');
  const ref = doc(db, 'mood_reflections', moodEntryId);
  await runTransaction(db, async tx => {
    const existing = await tx.get(ref);
    // Deleting an orphan reflection is allowed after Azhmen deletes its original entry.
    const mood = operation === 'delete' ? null : await tx.get(doc(db, 'mood_entries', moodEntryId));
    if (operation !== 'delete' && (!mood?.exists() || mood.data().userId !== uid)) throw new Error('You can only reflect on your own existing check-ins.');
    if (existing.exists() && (existing.data().userId !== uid || existing.data().moodEntryId !== moodEntryId)) throw new Error('You can only change your own reflections.');
    assertGihaniSession(uid);
    if (operation === 'create') {
      if (existing.exists()) throw new Error('A reflection already exists. Edit it instead.');
      tx.set(ref, { userId: uid, moodEntryId, reflection, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    } else {
      if (!existing.exists()) throw new Error('This reflection no longer exists.');
      if (operation === 'delete') tx.delete(ref);
      else tx.update(ref, { reflection, updatedAt: serverTimestamp() });
    }
  });
}
export function createMoodReflection(moodEntryId: string, text: string) { return mutateReflection(moodEntryId, 'create', text); }
export function updateMoodReflection(moodEntryId: string, text: string) { return mutateReflection(moodEntryId, 'update', text); }
export function deleteMoodReflection(moodEntryId: string) { return mutateReflection(moodEntryId, 'delete'); }
