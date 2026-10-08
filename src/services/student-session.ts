import { auth } from '@/config/firebase';

export function requireUserId(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Please sign in to continue.');
  return uid;
}
