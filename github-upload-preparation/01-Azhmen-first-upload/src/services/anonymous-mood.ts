import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where, type Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { getAnonymousSession, requireAnonymousUid } from '@/services/anonymous-session';
import { MOODS, type Mood } from '@/services/mood';

export interface MoodEntry {
  id: string;
  anonymousUid: string;
  sessionId: string;
  mood: Mood;
  moodScore: number;
  note: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}
function fields(mood: Mood, note: string) {
  if (!MOODS.includes(mood)) throw new Error('Please select a mood.');
  if (note.trim().length > 500) throw new Error('Keep your note within 500 characters.');
  return { mood, moodScore: 5 - MOODS.indexOf(mood), note: note.trim() };
}
export async function createMoodEntry(mood: Mood, note: string) {
  const { uid, sessionId } = await getAnonymousSession();
  const result = await addDoc(collection(db, 'anonymous_mood_entries'), {
    ...fields(mood, note), anonymousUid: uid, sessionId,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return result.id;
}
export async function getMoodEntriesForUser(): Promise<MoodEntry[]> {
  const { uid, sessionId } = await getAnonymousSession();
  const snapshot = await getDocs(query(collection(db, 'anonymous_mood_entries'), where('anonymousUid', '==', uid)));
  return snapshot.docs.map(entry => ({ ...entry.data(), id: entry.id }) as MoodEntry)
    .filter(entry => entry.sessionId === sessionId)
    .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
}
export async function getMoodEntry(id: string): Promise<MoodEntry> {
  const { uid, sessionId } = await getAnonymousSession();
  const snapshot = await getDoc(doc(db, 'anonymous_mood_entries', id));
  if (!snapshot.exists()) throw new Error('This mood entry no longer exists.');
  const entry = { ...snapshot.data(), id: snapshot.id } as MoodEntry;
  if (entry.anonymousUid !== uid || entry.sessionId !== sessionId) throw new Error('You can only access your own anonymous mood entries.');
  return entry;
}
export async function updateMoodEntry(id: string, mood: Mood, note: string) {
  const entry = await getMoodEntry(id);
  if (requireAnonymousUid() !== entry.anonymousUid) throw new Error('Your anonymous session changed.');
  await updateDoc(doc(db, 'anonymous_mood_entries', id), { ...fields(mood, note), updatedAt: serverTimestamp() });
}
export async function deleteMoodEntry(id: string) {
  const entry = await getMoodEntry(id);
  if (requireAnonymousUid() !== entry.anonymousUid) throw new Error('Your anonymous session changed.');
  await deleteDoc(doc(db, 'anonymous_mood_entries', id));
}
