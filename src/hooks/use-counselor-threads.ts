import { useEffect, useState } from 'react';
import { ensureCurrentCounselorDirectory } from '@/services/user-profile';
import { getCurrentUser } from '@/services/auth';
import { subscribeToCounselorThreads, type ChatThread } from '@/services/chat';
import { subscribeToCounselorThreads as subscribeToAnonymousThreads, type AnonymousChatThread } from '@/services/anonymous-chat';
import { getAuthErrorMessage } from '@/utils/auth';

export type CounselorThread = ChatThread | AnonymousChatThread;
export function isAnonymousThread(thread: CounselorThread): thread is AnonymousChatThread {
  return 'anonymous' in thread && thread.anonymous === true;
}
export function counselorConversationRoute(thread: CounselorThread) {
  return { pathname: '/counselor/chat/[threadId]' as const, params: { threadId: thread.id, anonymous: isAnonymousThread(thread) ? 'true' : 'false' } };
}

// Both dashboard and inbox reuse the existing two Firestore service listeners.
// No new chat service or reads of another user's private profile are needed.
export function useCounselorThreads() {
  const [studentThreads, setStudentThreads] = useState<ChatThread[]>([]);
  const [anonymousThreads, setAnonymousThreads] = useState<AnonymousChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const uid = getCurrentUser()?.uid;
  useEffect(() => {
    let active = true, failed = false, studentReady = false, anonymousReady = false;
    const stops: (() => void)[] = [];
    function fail(err: unknown, source = 'Counselor directory setup') {
      if (!active || failed) return;
      const denied = typeof err === 'object' && err !== null && 'code' in err && err.code === 'permission-denied';
      failed = true;
      setError(denied
        ? `${source} was denied. Confirm the latest Firestore rules are published in this app's Firebase project and your counselor directory document uses your exact account UID, then retry.`
        : getAuthErrorMessage(err));
      setLoading(false);
      setStudentThreads([]); setAnonymousThreads([]);
      stops.splice(0).forEach(stop => stop());
    }
    async function connect() {
      if (!uid) throw new Error('Please sign in with your counselor account.');
      // Also handles accounts restored directly into the counselor layout.
      await ensureCurrentCounselorDirectory();
      if (!active) return;
      stops.push(subscribeToCounselorThreads(data => {
        if (!active || failed) return;
        setStudentThreads(data); studentReady = true;
        if (anonymousReady) setLoading(false);
      }, err => fail(err, 'Registered student chat access')));
      if (!failed) stops.push(subscribeToAnonymousThreads(data => {
        if (!active || failed) return;
        setAnonymousThreads(data); anonymousReady = true;
        if (studentReady) setLoading(false);
      }, err => fail(err, 'Anonymous student chat access')));
    }
    void connect().catch(fail);
    return () => { active = false; stops.forEach(stop => stop()); };
  }, [uid, attempt]);
  const threads: CounselorThread[] = [...studentThreads, ...anonymousThreads].sort((a, b) =>
    (b.lastMessageAt?.toMillis() ?? b.createdAt?.toMillis() ?? 0) - (a.lastMessageAt?.toMillis() ?? a.createdAt?.toMillis() ?? 0));
  function reconnect() {
    setLoading(true); setError(''); setStudentThreads([]); setAnonymousThreads([]);
    setAttempt(value => value + 1);
  }
  return { threads, loading, error, reconnect };
}
