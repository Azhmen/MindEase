import { collection, doc, getDocs, query, runTransaction, serverTimestamp, where, writeBatch, type Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { assertGihaniSession, requireGihaniStudent } from '@/services/gihani-session';
import { getResource } from '@/services/resources';
import { STARTER_RESOURCES } from '@/constants/starter-resources';
import { savedResourceOperation } from '@/utils/saved-resource-errors';

export interface SavedResource {
  id: string; userId: string; resourceId: string; personalNote: string; favorite: boolean;
  savedAt: Timestamp | null; updatedAt: Timestamp | null;
}
// Read old saved notes without losing text. The next edit writes only the new schema.
function savedFromData(id: string, data: Record<string, unknown>): SavedResource {
  return { id, userId: data.userId as string, resourceId: data.resourceId as string,
    personalNote: typeof data.personalNote === 'string' ? data.personalNote : typeof data.reflection === 'string' ? data.reflection : '',
    favorite: data.favorite === true, savedAt: data.savedAt as Timestamp | null, updatedAt: data.updatedAt as Timestamp | null };
}
export async function getSavedResources(): Promise<SavedResource[]> {
  const uid = await requireGihaniStudent();
  const result = await getDocs(query(collection(db, 'saved_resources'), where('userId', '==', uid)));
  assertGihaniSession(uid);
  return result.docs.map(item => savedFromData(item.id, item.data())).sort((a, b) => (b.savedAt?.toMillis() ?? 0) - (a.savedAt?.toMillis() ?? 0));
}
export function savedResourceDocumentId(uid: string, resourceId: string) {
  if (!resourceId.trim() || resourceId.includes('/')) throw new Error('Choose a valid resource.');
  return uid + '_' + resourceId;
}
export async function saveResource(resourceId: string) {
  return savedResourceOperation('Unable to save this resource.', async () => {
    const uid = await requireGihaniStudent();
    const id = savedResourceDocumentId(uid, resourceId);
    // Bundled starter content does not need a resources/{id} document or read.
    if (!STARTER_RESOURCES.some(resource => resource.id === resourceId) && !await getResource(resourceId)) throw new Error('This resource is no longer available.');
    const owned = await getSavedResources();
    assertGihaniSession(uid);
    // Reuse older random-ID saves too; do not create a second copy on upgrade.
    const previous = owned.find(item => item.resourceId === resourceId);
    if (previous) return previous.id;
    const ref = doc(db, 'saved_resources', id);
    await runTransaction(db, async tx => {
      const existing = await tx.get(ref);
      assertGihaniSession(uid);
      if (existing.exists()) {
        if (existing.data().userId !== uid || existing.data().resourceId !== resourceId) throw new Error('You can only manage your own saved resources.');
        return;
      }
      tx.set(ref, { userId: uid, resourceId, personalNote: '', favorite: false, savedAt: serverTimestamp(), updatedAt: serverTimestamp() });
    });
    assertGihaniSession(uid);
    return id;
  });
}
async function mutateSaved(id: string, operation: 'favorite' | 'note', value?: boolean | string) {
  const uid = await requireGihaniStudent();
  const ref = doc(db, 'saved_resources', id);
  const text = typeof value === 'string' ? value.trim() : '';
  if (operation === 'note' && text.length > 1000) throw new Error('Keep your personal note within 1,000 characters.');
  await runTransaction(db, async tx => {
    const existing = await tx.get(ref);
    if (!existing.exists()) throw new Error('This saved resource no longer exists.');
    if (existing.data().userId !== uid) throw new Error('You can only manage your own saved resources.');
    assertGihaniSession(uid);
    if (operation === 'favorite' && typeof value !== 'boolean') throw new Error('Choose a favorite status.');
    const { id: ignoredId, ...fields } = savedFromData(id, existing.data());
    void ignoredId;
    // Replaces only the student's saved document, preserving identity and savedAt.
    tx.set(ref, { ...fields, personalNote: operation === 'note' ? text : fields.personalNote, favorite: operation === 'favorite' ? value : fields.favorite, updatedAt: serverTimestamp() });
  });
}
export function setSavedResourceFavorite(id: string, favorite: boolean) { return mutateSaved(id, 'favorite', favorite); }
export function updateSavedResourcePersonalNote(id: string, text: string) { return mutateSaved(id, 'note', text); }
// Removal uses the logical user+resource key, never guesses a saved-document ID.
// Querying owned saves also finds older random IDs and cleans up old duplicates.
export async function removeSavedResource(resourceId: string) {
  return savedResourceOperation('Unable to remove this resource.', async () => {
    const uid = await requireGihaniStudent();
    savedResourceDocumentId(uid, resourceId);
    const owned = (await getSavedResources()).filter(item => item.resourceId === resourceId);
    assertGihaniSession(uid);
    // Idempotent removal; another tab may already have removed it.
    for (let offset = 0; offset < owned.length; offset += 400) {
      const batch = writeBatch(db);
      owned.slice(offset, offset + 400).forEach(item => batch.delete(doc(db, 'saved_resources', item.id)));
      assertGihaniSession(uid);
      await batch.commit();
    }
  });
}
