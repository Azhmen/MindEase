import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { signInAnonymously, signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';

export const ANONYMOUS_SESSION_KEY = 'mindease_anonymous_session_id';
let pendingStart: Promise<void> | null = null;

export function requireAnonymousUid(): string {
  const user = auth.currentUser;
  if (!user?.isAnonymous) throw new Error('Open anonymous mode from Login to continue.');
  return user.uid;
}

export async function getAnonymousSession() {
  const uid = requireAnonymousUid();
  const sessionId = await AsyncStorage.getItem(ANONYMOUS_SESSION_KEY);
  if (!sessionId) throw new Error('Your local anonymous session is missing. Return to Login and continue anonymously.');
  if (requireAnonymousUid() !== uid) throw new Error('Your anonymous session changed. Reopen anonymous mode.');
  return { uid, sessionId };
}

export function startAnonymousSession(): Promise<void> {
  if (pendingStart) return pendingStart;
  pendingStart = (async () => {
    await auth.authStateReady();
    if (auth.currentUser && !auth.currentUser.isAnonymous) {
      // Switch sessions only; never delete or link the normal account.
      await signOut(auth);
    }
    const reusing = !!auth.currentUser?.isAnonymous;
    if (!reusing) await signInAnonymously(auth);
    requireAnonymousUid();
    // Never reuse a previous local ID with a new Firebase principal.
    const saved = reusing ? await AsyncStorage.getItem(ANONYMOUS_SESSION_KEY) : null;
    if (!saved) await AsyncStorage.setItem(ANONYMOUS_SESSION_KEY, randomUUID());
  })().finally(() => { pendingStart = null; });
  return pendingStart;
}

export async function exitAnonymousSession(): Promise<void> {
  await auth.authStateReady();
  if (auth.currentUser && !auth.currentUser.isAnonymous) throw new Error('This is not an anonymous session.');
  await signOut(auth);
  await AsyncStorage.removeItem(ANONYMOUS_SESSION_KEY);
  // No account linking, profile creation, or data copying occurs.
}
