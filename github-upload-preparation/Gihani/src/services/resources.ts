import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { STARTER_RESOURCES } from '@/constants/starter-resources';
import { assertGihaniSession, requireGihaniStudent } from '@/services/gihani-session';

export interface WellbeingResource {
  id: string; title: string; description: string; category: string; duration?: string; type?: string; imageUrl?: string; active: boolean; summary?: string; featured?: boolean;
}
function fromData(id: string, data: Record<string, unknown>): WellbeingResource | null {
  if (typeof data.title !== 'string' || !data.title.trim() || typeof data.description !== 'string' || typeof data.category !== 'string') return null;
  return { id, title: data.title.trim(), description: data.description, category: data.category, active: data.active === undefined || data.active === true,
    duration: typeof data.duration === 'string' ? data.duration : undefined, type: typeof data.type === 'string' ? data.type : undefined,
    summary: typeof data.summary === 'string' ? data.summary : undefined, featured: data.featured === true };
}
export async function getResources(): Promise<{ resources: WellbeingResource[]; source: 'firestore' | 'starter' }> {
  const uid = await requireGihaniStudent();
  const result = await getDocs(collection(db, 'resources'));
  assertGihaniSession(uid);
  // Empty collection only: permission/network errors remain errors, not a hidden fallback.
  if (!result.docs.length) return { resources: STARTER_RESOURCES.map(item => ({ ...item })), source: 'starter' };
  return { resources: result.docs.flatMap(item => { const resource = fromData(item.id, item.data()); return resource?.active ? [resource] : []; }), source: 'firestore' };
}
export async function getResource(id: string): Promise<WellbeingResource | null> {
  const uid = await requireGihaniStudent();
  const result = await getDoc(doc(db, 'resources', id));
  assertGihaniSession(uid);
  if (result.exists()) { const resource = fromData(id, result.data()); return resource?.active ? resource : null; }
  return STARTER_RESOURCES.find(item => item.id === id) ?? null;
}
// Resources are read-only. Students never write or delete original resources.
