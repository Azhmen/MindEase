import { getAuthErrorMessage } from '@/utils/auth';

export function logSavedResourceError(context: string, error: unknown) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // Keep the original FirebaseError (including code and stack) for debugging.
    console.error('[Saved Resources] ' + context, error);
  }
}

export async function savedResourceOperation<T>(label: string, action: () => Promise<T>): Promise<T> {
  try { return await action(); }
  catch (error) {
    logSavedResourceError(label, error);
    throw new Error(label + ' ' + getAuthErrorMessage(error), { cause: error });
  }
}
