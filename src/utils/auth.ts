import { FirebaseError } from 'firebase/app';
import type { UserRole } from '@/services/user-profile';

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function getRoleRoute(role: UserRole): '/student/home' | '/counselor/dashboard' {
  if (role === 'student') return '/student/home';
  if (role === 'counselor') return '/counselor/dashboard';
  throw new Error('Your profile has an unsupported role. Please contact support.');
}

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    const messages: Record<string, string> = {
      'auth/email-already-in-use': 'An account already exists with this email. Please log in.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/weak-password': 'Please use a stronger password with at least 6 characters.',
      'auth/invalid-credential': 'The email or password is incorrect.',
      'auth/user-not-found': 'The email or password is incorrect.',
      'auth/wrong-password': 'The email or password is incorrect.',
      'auth/user-disabled': 'This account has been disabled. Please contact support.',
      'auth/too-many-requests': 'Too many attempts. Please try again later.',
      'auth/network-request-failed': 'Check your internet connection and try again.',
      'auth/operation-not-allowed': 'This sign-in method is not enabled in Firebase. Enable the required Email/Password or Anonymous provider.',
      'permission-denied': 'Firebase denied access. Check your account and Firestore rules.',
      unavailable: 'Firebase is temporarily unavailable. Please try again.',
    };
    return messages[error.code] ?? error.message;
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
