import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type User,
  type UserCredential,
} from 'firebase/auth';

import { auth } from '@/config/firebase';

export function registerUser(email: string, password: string): Promise<UserCredential> {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function loginUser(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logoutUser(): Promise<void> {
  return signOut(auth);
}

// This synchronous snapshot may be null while Firebase restores authentication.
export function getCurrentUser(): User | null {
  return auth.currentUser;
}
