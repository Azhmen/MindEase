import { collection, doc, getDoc, onSnapshot, orderBy, query, runTransaction, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { getCurrentUser } from '@/services/auth';
import { getUserProfile } from '@/services/user-profile';
import { getAnonymousSession, requireAnonymousUid } from '@/services/anonymous-session';
import { getCounselor, type ChatMessage, type ChatThread } from '@/services/chat';

export interface AnonymousChatThread extends ChatThread {
  anonymous: true;
  sessionId: string;
  anonymousUid: string;
}
function threadData(id: string, data: Record<string, unknown>): AnonymousChatThread {
  // UI compatibility only: no studentId is stored in anonymous documents.
  return { ...data, id, studentId: '', anonymous: true } as AnonymousChatThread;
}
async function participant(thread: AnonymousChatThread) {
  const user = getCurrentUser();
  if (!user) throw new Error('Sign in or continue anonymously to open chat.');
  if (user.isAnonymous) {
    const { uid, sessionId } = await getAnonymousSession();
    if (thread.anonymousUid !== uid || thread.sessionId !== sessionId) throw new Error('This is not your anonymous conversation.');
    return { uid, senderType: 'anonymous' as const };
  }
  const profile = await getUserProfile(user.uid);
  if (profile?.role !== 'counselor' || thread.counselorId !== user.uid) throw new Error('This conversation is not assigned to your account.');
  if (getCurrentUser()?.uid !== user.uid) throw new Error('Your session changed. Reopen chat.');
  return { uid: user.uid, senderType: 'counselor' as const };
}
export async function createOrGetChatThread(counselorId: string) {
  const { uid, sessionId } = await getAnonymousSession();
  if (!counselorId) throw new Error('Choose a counselor to start your chat.');
  const counselor = await getCounselor(counselorId);
  if (!counselor?.active) throw new Error('This counselor is no longer accepting new chats.');
  const ref = doc(db, 'anonymous_chat_threads', sessionId);
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists()) {
      if (snapshot.data().anonymousUid !== uid) throw new Error('This is not your anonymous conversation.');
      return;
    }
    // Re-read the directory inside the transaction to avoid stale assignment.
    const directory = await transaction.get(doc(db, 'counselor_directory', counselorId));
    if (!directory.exists() || directory.data().active === false) throw new Error('This counselor is no longer accepting new chats.');
    if (requireAnonymousUid() !== uid) throw new Error('Your anonymous session changed.');
    transaction.set(ref, { sessionId, anonymousUid: uid, counselorId, createdAt: serverTimestamp(), lastMessage: '', lastMessageAt: null });
  });
  return sessionId;
}
export async function getChatThread(threadId: string) {
  const snapshot = await getDoc(doc(db, 'anonymous_chat_threads', threadId));
  if (!snapshot.exists()) throw new Error('This conversation no longer exists.');
  const thread = threadData(snapshot.id, snapshot.data());
  await participant(thread);
  return thread;
}
export function subscribeToThread(threadId: string, onThread: (thread: AnonymousChatThread) => void, onError: (error: Error) => void) {
  return onSnapshot(doc(db, 'anonymous_chat_threads', threadId), snapshot => {
    if (!snapshot.exists()) { onError(new Error('This conversation no longer exists.')); return; }
    onThread(threadData(snapshot.id, snapshot.data({ serverTimestamps: 'estimate' })));
  }, onError);
}
export async function subscribeToStudentThread(onThread: (thread: AnonymousChatThread | null) => void, onError: (error: Error) => void) {
  const { sessionId } = await getAnonymousSession();
  return onSnapshot(doc(db, 'anonymous_chat_threads', sessionId), snapshot => {
    onThread(snapshot.exists() ? threadData(snapshot.id, snapshot.data({ serverTimestamps: 'estimate' })) : null);
  }, onError);
}
export function subscribeToCounselorThreads(onThreads: (threads: AnonymousChatThread[]) => void, onError: (error: Error) => void) {
  const user = getCurrentUser();
  if (!user || user.isAnonymous) throw new Error('Sign in as a counselor to view assigned conversations.');
  return onSnapshot(query(collection(db, 'anonymous_chat_threads'), where('counselorId', '==', user.uid)), snapshot => {
    onThreads(snapshot.docs.map(entry => threadData(entry.id, entry.data({ serverTimestamps: 'estimate' }))));
  }, onError);
}
export function subscribeToMessages(threadId: string, onMessages: (messages: ChatMessage[]) => void, onError: (error: Error) => void) {
  // Translate senderType into the shared bubble model without storing a
  // student name, email, student ID, senderId, or user-profile document.
  const user = getCurrentUser();
  if (!user) throw new Error('Your chat session has ended.');
  return onSnapshot(query(collection(db, 'anonymous_chat_threads', threadId, 'messages'), orderBy('createdAt', 'asc')), snapshot => {
    onMessages(snapshot.docs.map(entry => {
      const data = entry.data({ serverTimestamps: 'estimate' });
      const own = user.isAnonymous ? data.senderType === 'anonymous' : data.senderType === 'counselor';
      return { ...data, id: entry.id, senderId: own ? user.uid : '', senderRole: data.senderType === 'counselor' ? 'counselor' : 'student' } as ChatMessage;
    }));
  }, onError);
}
function validText(text: string) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Enter a message before saving.');
  if (trimmed.length > 2000) throw new Error('Keep messages within 2,000 characters.');
  return trimmed;
}
export async function sendMessage(threadId: string, text: string) {
  const trimmed = validText(text);
  const thread = await getChatThread(threadId);
  const { uid, senderType } = await participant(thread);
  if (getCurrentUser()?.uid !== uid) throw new Error('Your session changed. Reopen chat.');
  const ref = doc(db, 'anonymous_chat_threads', threadId);
  const batch = writeBatch(db);
  batch.set(doc(collection(ref, 'messages')), { anonymousUid: thread.anonymousUid, senderType, text: trimmed, createdAt: serverTimestamp(), edited: false, updatedAt: serverTimestamp() });
  batch.update(ref, { lastMessage: trimmed, lastMessageAt: serverTimestamp() });
  await batch.commit();
}
async function mutateOwnMessage(threadId: string, messageId: string, text?: string) {
  const thread = await getChatThread(threadId);
  const session = await participant(thread);
  const threadRef = doc(db, 'anonymous_chat_threads', threadId);
  const messageRef = doc(threadRef, 'messages', messageId);
  await runTransaction(db, async transaction => {
    const parent = await transaction.get(threadRef);
    const snapshot = await transaction.get(messageRef);
    if (!parent.exists() || !snapshot.exists()) throw new Error('This message no longer exists.');
    const current = parent.data();
    if ((session.senderType === 'anonymous' ? current.anonymousUid : current.counselorId) !== session.uid || getCurrentUser()?.uid !== session.uid) throw new Error('Your chat access changed.');
    const message = snapshot.data();
    if (message.senderType !== session.senderType || message.anonymousUid !== current.anonymousUid) throw new Error('You can only change your own messages.');
    if (text === undefined) transaction.delete(messageRef);
    else transaction.update(messageRef, { text, edited: true, updatedAt: serverTimestamp() });
    if (message.createdAt && current.lastMessageAt
      && message.createdAt.seconds === current.lastMessageAt.seconds
      && message.createdAt.nanoseconds === current.lastMessageAt.nanoseconds
      && message.text === current.lastMessage) transaction.update(threadRef, { lastMessage: text ?? 'Message deleted' });
  });
}
export async function updateOwnMessage(threadId: string, messageId: string, text: string) { await mutateOwnMessage(threadId, messageId, validText(text)); }
export async function deleteOwnMessage(threadId: string, messageId: string) { await mutateOwnMessage(threadId, messageId); }
