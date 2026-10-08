import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, initializeAuth, type Persistence } from 'firebase/auth';
import * as FirebaseAuth from 'firebase/auth';
import type { FirebaseApp } from 'firebase/app';

export function initializeMindEaseAuth(app: FirebaseApp) {
  // Metro selects Firebase's React Native export; its platform-only helper is
  // not declared in the default web types used by TypeScript.
  const { getReactNativePersistence } = FirebaseAuth as unknown as {
    getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
  };
  try { return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) }); }
  catch (error) {
    if ((error as { code?: string }).code === 'auth/already-initialized') return getAuth(app);
    throw error;
  }
}
