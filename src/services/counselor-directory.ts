import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { requireUserId } from '@/services/student-session';

export interface DirectoryCounselor {
  id: string;
  name: string;
  title?: string;
  specialization?: string;
}

export function directoryCounselor(id: string, data: Record<string, unknown>, purpose: 'booking' | 'chat'): DirectoryCounselor | null {
  if (data.active !== true || data[purpose + 'Available'] === false || typeof data.name !== 'string' || !data.name.trim()) return null;
  return {
    id, name: data.name.trim(),
    title: typeof data.title === 'string' ? data.title : undefined,
    specialization: typeof data.specialization === 'string' ? data.specialization : typeof data.specialty === 'string' ? data.specialty : undefined,
  };
}

// Optional availability flags are filtered locally so legacy records without
// those flags remain discoverable. No composite index is needed.
export function subscribeToDirectory(purpose: 'booking' | 'chat', onCounselors: (rows: DirectoryCounselor[]) => void, onError: (error: Error) => void) {
  const uid = requireUserId();
  return onSnapshot(query(collection(db, 'counselor_directory'), where('active', '==', true)), snapshot => {
    try {
      if (requireUserId() !== uid) throw new Error('Your account changed. Please reopen counselor selection.');
      onCounselors(snapshot.docs.flatMap(item => {
        const counselor = directoryCounselor(item.id, item.data(), purpose);
        return counselor ? [counselor] : [];
      }).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) { onError(error instanceof Error ? error : new Error('Could not load counselors.')); }
  }, onError);
}
