import { getAuth } from 'firebase/auth';
import type { FirebaseApp } from 'firebase/app';

// Preserve the existing web authentication initialization and persistence.
export function initializeMindEaseAuth(app: FirebaseApp) { return getAuth(app); }
