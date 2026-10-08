import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where, type Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { requireUserId } from '@/services/student-session';

// Assignment owner: Azhmen. This service owns mood_entries CRUD for the current user.
// Gihani's future reflection CRUD belongs in a separate mood_reflections service;
// reflection operations must not update or delete these mood entries.

export const MOODS = ['Great', 'Good', 'Okay', 'Low', 'Very Low'] as const;
export type Mood = typeof MOODS[number];
export interface MoodEntry {
  id: string;
  userId: string;
  mood: Mood;
  moodScore: number;
  note: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

function moodFields(mood: Mood, note: string) {
  if (!MOODS.includes(mood)) throw new Error('Please select a mood.');
  if (note.trim().length > 500) throw new Error('Keep your note within 500 characters.');
  return { mood, moodScore: 5 - MOODS.indexOf(mood), note: note.trim() };
}

export async function createMoodEntry(mood: Mood, note: string): Promise<string> {
  const userId = requireUserId();
  const entry = await addDoc(collection(db, 'mood_entries'), {
    ...moodFields(mood, note), userId, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return entry.id;
}

export async function getMoodEntriesForUser(): Promise<MoodEntry[]> {
  const snapshot = await getDocs(query(collection(db, 'mood_entries'), where('userId', '==', requireUserId())));
  // Sort locally to avoid requiring a composite index for this small assignment.
  return snapshot.docs.map(entry => ({ ...entry.data(), id: entry.id }) as MoodEntry)
    .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
}

export async function getMoodEntry(id: string): Promise<MoodEntry> {
  const uid = requireUserId();
  const snapshot = await getDoc(doc(db, 'mood_entries', id));
  if (!snapshot.exists()) throw new Error('This mood entry no longer exists.');
  if (snapshot.data().userId !== uid) throw new Error('You can only access your own mood entries.');
  return { ...snapshot.data(), id: snapshot.id } as MoodEntry;
}

export async function updateMoodEntry(id: string, mood: Mood, note: string): Promise<void> {
  await getMoodEntry(id);
  await updateDoc(doc(db, 'mood_entries', id), { ...moodFields(mood, note), updatedAt: serverTimestamp() });
}

export async function deleteMoodEntry(id: string): Promise<void> {
  await getMoodEntry(id);
  await deleteDoc(doc(db, 'mood_entries', id));
}
