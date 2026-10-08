// Execute inside demo-mindease Firestore emulator; never production.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, serverTimestamp } = require('firebase/firestore');
async function test() {
  const env = await initializeTestEnvironment({ projectId: 'demo-mindease', firestore: { host: '127.0.0.1', port: 8089, rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8') } });
  const student = env.authenticatedContext('student-a').firestore();
  const other = env.authenticatedContext('student-b').firestore();
  const counselor = env.authenticatedContext('counselor-a').firestore();
  const guest = env.authenticatedContext('guest-a', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
  const signedOut = env.unauthenticatedContext().firestore();
  try {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      for (const [uid, role] of [['student-a', 'student'], ['student-b', 'student'], ['counselor-a', 'counselor']]) await setDoc(doc(db, 'users', uid), { role });
      await setDoc(doc(db, 'mood_entries/mood-a'), { userId: 'student-a', mood: 'Good', moodScore: 4, note: 'Original check-in', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      await setDoc(doc(db, 'mood_entries/mood-b'), { userId: 'student-b', mood: 'Low', moodScore: 2, note: '', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      await setDoc(doc(db, 'resources/published'), { title: 'Original guide', description: 'Brief original guidance', category: 'Focus', active: true });
      await setDoc(doc(db, 'resources/inactive'), { title: 'Inactive guide', description: 'Guidance', category: 'Focus', active: false });
      await setDoc(doc(db, 'resources/starter-sleep-wind-down'), { title: 'Disabled starter override', description: 'Guidance', category: 'Sleep', active: false });
    });
    const reflectionPath = 'mood_reflections/mood-a';
    const reflection = { userId: 'student-a', moodEntryId: 'mood-a', reflection: 'A new perspective', createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await assertSucceeds(getDoc(doc(student, reflectionPath))); // absent own reflection
    await assertSucceeds(setDoc(doc(student, reflectionPath), reflection));
    await assertSucceeds(getDocs(query(collection(student, 'mood_reflections'), where('userId', '==', 'student-a'))));
    await assertFails(getDocs(collection(student, 'mood_reflections')));
    await assertFails(setDoc(doc(student, 'mood_reflections/mood-b'), { ...reflection, moodEntryId: 'mood-b' }));
    await assertFails(setDoc(doc(student, 'mood_reflections/duplicate-id'), reflection));
    await assertFails(setDoc(doc(student, 'mood_reflections/missing'), { ...reflection, moodEntryId: 'missing' }));
    for (const db of [other, counselor, guest, signedOut]) {
      await assertFails(getDoc(doc(db, reflectionPath)));
      await assertFails(updateDoc(doc(db, reflectionPath), { reflection: 'Foreign', updatedAt: serverTimestamp() }));
      await assertFails(deleteDoc(doc(db, reflectionPath)));
    }
    for (const change of [{ userId: 'student-b' }, { moodEntryId: 'mood-b' }, { createdAt: serverTimestamp() }, { reflection: ' ' }, { reflection: 'x'.repeat(1001) }]) {
      await assertFails(updateDoc(doc(student, reflectionPath), { ...change, updatedAt: serverTimestamp() }));
    }
    await assertSucceeds(updateDoc(doc(student, reflectionPath), { reflection: 'Changed perspective', updatedAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(doc(student, reflectionPath)));
    assert.equal((await getDoc(doc(student, 'mood_entries/mood-a'))).data().note, 'Original check-in');

    await assertSucceeds(getDocs(collection(student, 'resources')));
    await assertFails(getDocs(collection(signedOut, 'resources')));
    await assertFails(setDoc(doc(student, 'resources/new'), { title: 'Student write' }));
    await assertFails(updateDoc(doc(student, 'resources/published'), { title: 'Changed' }));
    await assertFails(deleteDoc(doc(student, 'resources/published')));
    const savedData = { userId: 'student-a', resourceId: 'published', savedAt: serverTimestamp(), favorite: false, personalNote: '', updatedAt: serverTimestamp() };
    const savedPath = 'saved_resources/student-a_published';
    await assertSucceeds(getDoc(doc(student, savedPath)));
    await assertSucceeds(setDoc(doc(student, savedPath), savedData));
    await assertSucceeds(getDocs(query(collection(student, 'saved_resources'), where('userId', '==', 'student-a'))));
    await assertFails(getDocs(collection(student, 'saved_resources')));
    await assertFails(setDoc(doc(student, 'saved_resources/duplicate'), savedData));
    await assertSucceeds(setDoc(doc(student, 'saved_resources/student-a_missing'), { ...savedData, resourceId: 'missing' }));
    await assertSucceeds(setDoc(doc(student, 'saved_resources/student-a_inactive'), { ...savedData, resourceId: 'inactive' }));
    await assertSucceeds(setDoc(doc(student, 'saved_resources/student-a_starter-stress-reset'), { ...savedData, resourceId: 'starter-stress-reset' }));
    await assertSucceeds(setDoc(doc(student, 'saved_resources/student-a_starter-sleep-wind-down'), { ...savedData, resourceId: 'starter-sleep-wind-down' }));
    for (const db of [other, counselor, guest, signedOut]) {
      await assertFails(getDoc(doc(db, savedPath)));
      await assertFails(updateDoc(doc(db, savedPath), { personalNote: 'Foreign', updatedAt: serverTimestamp() }));
      await assertFails(updateDoc(doc(db, savedPath), { favorite: true, updatedAt: serverTimestamp() }));
      await assertFails(deleteDoc(doc(db, savedPath)));
    }
    for (const change of [{ userId: 'student-b' }, { resourceId: 'inactive' }, { savedAt: serverTimestamp() }, { personalNote: 'x'.repeat(1001) }, { favorite: 'invalid' }]) {
      await assertFails(updateDoc(doc(student, savedPath), { ...change, updatedAt: serverTimestamp() }));
    }
    await assertSucceeds(updateDoc(doc(student, savedPath), { favorite: true, updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(student, savedPath), { personalNote: 'It helped', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(student, savedPath), { completedAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(student, savedPath), { favorite: false, updatedAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(doc(student, savedPath)));
    await env.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'saved_resources/student-a_legacy'), { userId: 'student-a', resourceId: 'legacy', savedAt: serverTimestamp(), completed: true, completedAt: serverTimestamp(), reflection: 'Keep this note', updatedAt: serverTimestamp() });
    });
    const legacy = (await getDoc(doc(student, 'saved_resources/student-a_legacy'))).data();
    await assertSucceeds(setDoc(doc(student, 'saved_resources/student-a_legacy'), { userId: 'student-a', resourceId: 'legacy', personalNote: legacy.reflection, favorite: true, savedAt: legacy.savedAt, updatedAt: serverTimestamp() }));
    assert.ok((await getDoc(doc(student, 'resources/published'))).exists());
    console.log('PASS: Gihani rules; student-only/own-only CRUD, linked mood ownership, immutable fields, resource write denial, duplicate IDs, personal notes/favorites, catalog-independent private bookmarks, original document preservation.');
  } finally { await env.cleanup(); }
}
test().catch(error => { console.error(error); process.exitCode = 1; });
