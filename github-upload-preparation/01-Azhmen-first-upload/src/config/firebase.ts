
import { getApp, getApps, initializeApp } from 'firebase/app';
import { initializeMindEaseAuth } from '@/config/auth-instance';
import { getFirestore } from 'firebase/firestore';

// Expo requires direct process.env access to inline public environment variables.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};


for (const [key, value] of Object.entries(firebaseConfig)) {
  if (!value?.trim()) {
    throw new Error(`Missing Firebase environment configuration: ${key}`);
  }
}

// Reuse the default app during Expo Fast Refresh.
export const app = getApps().some((existingApp) => existingApp.name === '[DEFAULT]')
  ? getApp()
  : initializeApp(firebaseConfig);

export const auth = initializeMindEaseAuth(app);
export const db = getFirestore(app);
