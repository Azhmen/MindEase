import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, runTransaction, serverTimestamp, where, writeBatch, type Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { requireUserId } from '@/services/student-session';
import { getUserProfile, type UserRole } from '@/services/user-profile';

// Azhmen: live chat with optional sender-only message editing/deletion.
export interface Counselor {
  id: string;
  name: string;
  title?: string;
  active: boolean;
}
export interface ChatThread {
  id: string;
  studentId: string;
  counselorId: string;
  createdAt: Timestamp | null;
  lastMessage: string;
  lastMessageAt: Timestamp | null;
}
export interface ChatMessage {
  id: string;
  senderId: string;
  senderRole: UserRole;
  text: string;
  createdAt: Timestamp | null;
  updatedAt?: Timestamp | null;
  edited?: boolean;
}

// Read both documents inside a transaction so concurrent sends cannot overwrite
// a newer preview. Preserve the original message time when changing a preview.
async function mutateOwnMessage(threadId: string, messageId: string, text?: string) {
  const { uid, role } = await getSession();
  const threadRef = doc(db, 'chat_threads', threadId);
  const messageRef = doc(threadRef, 'messages', messageId);
  await runTransaction(db, async transaction => {
    const threadSnapshot = await transaction.get(threadRef);
    const messageSnapshot = await transaction.get(messageRef);
    if (!threadSnapshot.exists()) throw new Error('This conversation no longer exists.');
    const thread = threadSnapshot.data() as ChatThread;
    if ((role === 'student' ? thread.studentId : thread.counselorId) !== uid) throw new Error('This conversation is not assigned to your account.');
    if (!messageSnapshot.exists()) throw new Error('This message no longer exists.');
    const message = messageSnapshot.data() as ChatMessage;
    if (message.senderId !== uid) throw new Error('You can only change your own messages.');
    if (requireUserId() !== uid) throw new Error('Your session changed. Please reopen chat.');
    if (text === undefined) transaction.delete(messageRef);
    else transaction.update(messageRef, { text, edited: true, updatedAt: serverTimestamp() });
    // Full timestamp equality avoids confusing messages sent close together.
    if (thread.lastMessageAt && message.createdAt
      && thread.lastMessageAt.seconds === message.createdAt.seconds
      && thread.lastMessageAt.nanoseconds === message.createdAt.nanoseconds
      && thread.lastMessage === message.text) {
      transaction.update(threadRef, { lastMessage: text ?? 'Message deleted' });
    }
  });
}
export async function updateOwnMessage(threadId: string, messageId: string, newText: string): Promise<void> {
  const text = newText.trim();
  if (!text) throw new Error('Enter a message before saving.');
  if (text.length > 2000) throw new Error('Keep messages within 2,000 characters.');
  await mutateOwnMessage(threadId, messageId, text);
}
export async function deleteOwnMessage(threadId: string, messageId: string): Promise<void> {
  await mutateOwnMessage(threadId, messageId);
}

async function getSession() {
  const uid = requireUserId();
  const profile = await getUserProfile(uid);
  if (!profile || !['student', 'counselor'].includes(profile.role)) throw new Error('Your account needs a valid student or counselor profile.');
  if (requireUserId() !== uid) throw new Error('Your session changed. Please reopen chat.');
  return { uid, role: profile.role };
}
function counselorFromData(id: string, data: Record<string, unknown>): Counselor | null {
  if (typeof data.name !== 'string' || !data.name.trim()) return null;
  return { id, name: data.name.trim(), title: typeof data.title === 'string' ? data.title : undefined, active: data.active === undefined || data.active === true };
}
export async function getActiveCounselors(): Promise<Counselor[]> {
  requireUserId();
  const snapshot = await getDocs(collection(db, 'counselor_directory'));
  return snapshot.docs.flatMap(entry => {
    const counselor = counselorFromData(entry.id, entry.data());
    return counselor?.active ? [counselor] : [];
  }).sort((a, b) => a.name.localeCompare(b.name));
}
export async function getCounselor(counselorId: string): Promise<Counselor | null> {
  requireUserId();
  const snapshot = await getDoc(doc(db, 'counselor_directory', counselorId));
  return snapshot.exists() ? counselorFromData(snapshot.id, snapshot.data()) : null;
}
export async function createOrGetChatThread(counselorId: string): Promise<string> {
  const { uid, role } = await getSession();
  if (role !== 'student') throw new Error('Only students can start a support conversation.');
  if (!counselorId) throw new Error('Choose a counselor to start your chat.');
  const ref = doc(db, 'chat_threads', uid);
  // One thread per student. Concurrent starts reuse the first assignment.
  await runTransaction(db, async transaction => {
    const existing = await transaction.get(ref);
    if (existing.exists()) {
      if (existing.data().studentId !== uid) throw new Error('This is not your chat thread.');
      return;
    }
    const directory = await transaction.get(doc(db, 'counselor_directory', counselorId));
    const counselor = directory.exists() ? counselorFromData(directory.id, directory.data()) : null;
    if (!counselor?.active) throw new Error('This counselor is no longer accepting new chats. Refresh the counselor list.');
    if (requireUserId() !== uid) throw new Error('Your session changed. Please reopen chat.');
    // Rules also verify the selected UID has an actual counselor user profile.
    transaction.set(ref, { studentId: uid, counselorId, createdAt: serverTimestamp(), lastMessage: '', lastMessageAt: null });
  });
  return uid;
}
export async function getChatThread(threadId: string): Promise<ChatThread> {
  const { uid, role } = await getSession();
  const snapshot = await getDoc(doc(db, 'chat_threads', threadId));
  if (!snapshot.exists()) throw new Error('This conversation no longer exists.');
  const thread = { ...snapshot.data(), id: snapshot.id } as ChatThread;
  if ((role === 'student' ? thread.studentId : thread.counselorId) !== uid) throw new Error('This conversation is not assigned to your account.');
  return thread;
}
export function subscribeToStudentThread(onThread: (thread: ChatThread | null) => void, onError: (error: Error) => void) {
  const uid = requireUserId();
  return onSnapshot(doc(db, 'chat_threads', uid), snapshot => {
    onThread(snapshot.exists() ? { ...snapshot.data({ serverTimestamps: 'estimate' }), id: snapshot.id } as ChatThread : null);
  }, onError);
}
export function subscribeToThread(threadId: string, onThread: (thread: ChatThread) => void, onError: (error: Error) => void) {
  requireUserId();
  return onSnapshot(doc(db, 'chat_threads', threadId), snapshot => {
    if (!snapshot.exists()) { onError(new Error('This conversation no longer exists.')); return; }
    onThread({ ...snapshot.data({ serverTimestamps: 'estimate' }), id: snapshot.id } as ChatThread);
  }, onError);
}
export function subscribeToCounselorThreads(onThreads: (threads: ChatThread[]) => void, onError: (error: Error) => void) {
  const uid = requireUserId();
  return onSnapshot(query(collection(db, 'chat_threads'), where('counselorId', '==', uid)), snapshot => {
    const threads = snapshot.docs.map(entry => ({ ...entry.data({ serverTimestamps: 'estimate' }), id: entry.id }) as ChatThread);
    onThreads(threads.sort((a, b) => (b.lastMessageAt?.toMillis() ?? b.createdAt?.toMillis() ?? 0) - (a.lastMessageAt?.toMillis() ?? a.createdAt?.toMillis() ?? 0)));
  }, onError);
}
export function subscribeToMessages(threadId: string, onMessages: (messages: ChatMessage[]) => void, onError: (error: Error) => void) {
  requireUserId();
  return onSnapshot(query(collection(db, 'chat_threads', threadId, 'messages'), orderBy('createdAt', 'asc')), snapshot => {
    onMessages(snapshot.docs.map(entry => ({ ...entry.data({ serverTimestamps: 'estimate' }), id: entry.id }) as ChatMessage));
  }, onError);
}
export async function sendMessage(threadId: string, text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Enter a message before sending.');
  if (trimmed.length > 2000) throw new Error('Keep messages within 2,000 characters.');
  const { uid, role } = await getSession();
  const thread = await getChatThread(threadId);
  if ((role === 'student' ? thread.studentId : thread.counselorId) !== uid || requireUserId() !== uid) throw new Error('Your chat access changed. Please reopen chat.');
  const threadRef = doc(db, 'chat_threads', threadId);
  const batch = writeBatch(db);
  batch.set(doc(collection(threadRef, 'messages')), { senderId: uid, senderRole: role, text: trimmed, createdAt: serverTimestamp() });
  batch.update(threadRef, { lastMessage: trimmed, lastMessageAt: serverTimestamp() });
  await batch.commit();
}
