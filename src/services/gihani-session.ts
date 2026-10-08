import { getCurrentUser } from '@/services/auth';
import { getUserProfile } from '@/services/user-profile';
export async function requireGihaniStudent() {
  const user = getCurrentUser();
  if (!user || user.isAnonymous) throw new Error('Please sign in with a student account.');
  const profile = await getUserProfile(user.uid);
  if (profile?.role !== 'student') throw new Error('Please sign in with a student account.');
  assertGihaniSession(user.uid);
  return user.uid;
}
export function assertGihaniSession(uid: string) {
  if (getCurrentUser()?.uid !== uid || getCurrentUser()?.isAnonymous) throw new Error('Your account changed. Please reopen this screen.');
}
