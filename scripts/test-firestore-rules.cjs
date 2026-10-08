// Real Firestore emulator tests; demo project only, never production data.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, onSnapshot, serverTimestamp, writeBatch } = require('firebase/firestore');

async function test() {
  const env = await initializeTestEnvironment({ projectId: 'demo-mindease', firestore: { host: '127.0.0.1', port: 8089, rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8') } });
  const guestId = 'guest-a', sessionId = '11111111-1111-4111-a111-111111111111';
  const threadPath = 'anonymous_chat_threads/' + sessionId;
  const guest = env.authenticatedContext(guestId, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
  const otherGuest = env.authenticatedContext('guest-b', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
  const student = env.authenticatedContext('student-a', { email: 'student@example.test' }).firestore();
  const counselor = env.authenticatedContext('counselor-a').firestore();
  const otherCounselor = env.authenticatedContext('counselor-b').firestore();
  const signedOut = env.unauthenticatedContext().firestore();
  const stops = [];
  try {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      await Promise.all(['student-a', 'counselor-a', 'counselor-b'].map(uid => setDoc(doc(db, 'users', uid), { role: uid.startsWith('student') ? 'student' : 'counselor' })));
      await setDoc(doc(db, 'counselor_directory', 'counselor-a'), { name: 'Test Counselor', active: true });
      await setDoc(doc(db, 'counselor_directory', 'counselor-b'), { name: 'Other Counselor', active: true });
    });
    await assertSucceeds(getDocs(collection(guest, 'counselor_directory')));
    const moodPath = 'anonymous_mood_entries/first';
    const moodData = { sessionId, anonymousUid: guestId, mood: 'Good', moodScore: 4, note: '', createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await assertSucceeds(setDoc(doc(guest, moodPath), moodData));
    await assertSucceeds(getDocs(query(collection(guest, 'anonymous_mood_entries'), where('anonymousUid', '==', guestId))));
    await assertFails(getDocs(collection(guest, 'anonymous_mood_entries')));
    for (const db of [otherGuest, counselor, student, signedOut]) {
      await assertFails(getDoc(doc(db, moodPath)));
      await assertFails(updateDoc(doc(db, moodPath), { note: 'Forbidden', updatedAt: serverTimestamp() }));
      await assertFails(deleteDoc(doc(db, moodPath)));
    }
    await assertFails(setDoc(doc(guest, 'anonymous_mood_entries/forged'), { ...moodData, anonymousUid: 'guest-b' }));
    await assertFails(setDoc(doc(student, 'anonymous_mood_entries/not-anonymous'), { ...moodData, anonymousUid: 'student-a' }));
    await assertFails(updateDoc(doc(guest, moodPath), { anonymousUid: 'guest-b', updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(guest, moodPath), { mood: 'Low', moodScore: 2, note: 'Updated', updatedAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(doc(guest, moodPath)));
    await assertSucceeds(getDoc(doc(guest, threadPath))); // missing own session
    await assertSucceeds(setDoc(doc(guest, threadPath), { sessionId, anonymousUid: guestId, counselorId: 'counselor-a', createdAt: serverTimestamp(), lastMessage: '', lastMessageAt: null }));
    await assertFails(updateDoc(doc(guest, threadPath), { counselorId: 'counselor-b' }));
    await assertSucceeds(getDocs(query(collection(counselor, 'anonymous_chat_threads'), where('counselorId', '==', 'counselor-a'))));
    for (const db of [otherGuest, otherCounselor, student, signedOut]) {
      await assertFails(getDoc(doc(db, threadPath)));
      await assertFails(getDocs(collection(db, threadPath + '/messages')));
    }
    async function send(db, id, senderType, text) {
      const batch = writeBatch(db);
      batch.set(doc(db, threadPath + '/messages/' + id), { anonymousUid: guestId, senderType, text, createdAt: serverTimestamp(), edited: false, updatedAt: serverTimestamp() });
      batch.update(doc(db, threadPath), { lastMessage: text, lastMessageAt: serverTimestamp() });
      return batch.commit();
    }
    let guestMessages = [], counselorMessages = [];
    let guestError, counselorError;
    stops.push(onSnapshot(query(collection(guest, threadPath + '/messages'), orderBy('createdAt', 'asc')), snapshot => { guestMessages = snapshot.docs.map(row => ({ id: row.id, ...row.data() })); }, error => { guestError = error; }));
    stops.push(onSnapshot(query(collection(counselor, threadPath + '/messages'), orderBy('createdAt', 'asc')), snapshot => { counselorMessages = snapshot.docs.map(row => ({ id: row.id, ...row.data() })); }, error => { counselorError = error; }));
    async function waitFor(check) {
      for (let attempt = 0; attempt < 100; attempt++) {
        if (guestError || counselorError) throw guestError || counselorError;
        if (check()) return;
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      throw new Error('Live listener did not receive the expected change.');
    }
    await assertSucceeds(send(guest, 'guest-message', 'anonymous', 'Hello anonymously'));
    await waitFor(() => counselorMessages.length === 1);
    await assertSucceeds(send(counselor, 'reply', 'counselor', 'Hello, I am here'));
    await waitFor(() => guestMessages.length === 2);
    await assertFails(send(guest, 'fake-counselor', 'counselor', 'Impersonation'));
    await assertFails(send(counselor, 'fake-guest', 'anonymous', 'Impersonation'));
    await assertFails(send(otherGuest, 'foreign-guest', 'anonymous', 'Forbidden'));
    await assertFails(send(otherCounselor, 'foreign-counselor', 'counselor', 'Forbidden'));
    const own = doc(guest, threadPath + '/messages/guest-message');
    const reply = doc(counselor, threadPath + '/messages/reply');
    const changes = { text: 'Edited', edited: true, updatedAt: serverTimestamp() };
    await assertFails(updateDoc(doc(guest, threadPath + '/messages/reply'), changes));
    await assertFails(deleteDoc(doc(guest, threadPath + '/messages/reply')));
    await assertFails(updateDoc(doc(counselor, threadPath + '/messages/guest-message'), changes));
    await assertFails(deleteDoc(doc(counselor, threadPath + '/messages/guest-message')));
    await assertFails(updateDoc(own, { ...changes, senderType: 'counselor' }));
    await assertFails(updateDoc(own, { ...changes, anonymousUid: 'guest-b' }));
    await assertFails(updateDoc(own, { ...changes, createdAt: serverTimestamp() }));
    await assertFails(updateDoc(own, { ...changes, text: '  ' }));
    await assertSucceeds(updateDoc(own, changes));
    await waitFor(() => counselorMessages[0]?.edited === true);
    const previewBatch = writeBatch(counselor);
    previewBatch.update(reply, { text: 'Counselor edited', edited: true, updatedAt: serverTimestamp() });
    previewBatch.update(doc(counselor, threadPath), { lastMessage: 'Counselor edited' });
    await assertSucceeds(previewBatch.commit());
    await waitFor(() => guestMessages[1]?.text === 'Counselor edited');
    assert.equal((await getDoc(doc(guest, threadPath))).data().lastMessage, 'Counselor edited');
    // Fresh SDK contexts read persisted records, independent of listener state.
    const refreshed = env.authenticatedContext(guestId, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
    assert.equal((await assertSucceeds(getDocs(collection(refreshed, threadPath + '/messages')))).size, 2);
    await assertSucceeds(deleteDoc(own)); await waitFor(() => counselorMessages.length === 1);
    const deletionBatch = writeBatch(counselor);
    deletionBatch.delete(reply); deletionBatch.update(doc(counselor, threadPath), { lastMessage: 'Message deleted' });
    await assertSucceeds(deletionBatch.commit()); await waitFor(() => guestMessages.length === 0);

    // Existing authenticated student mood/chat CRUD remain allowed and isolated.
    await assertSucceeds(setDoc(doc(student, 'mood_entries/student-mood'), { userId: 'student-a', mood: 'Good', moodScore: 4, note: '', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(student, 'mood_entries/student-mood'), { note: 'Updated', updatedAt: serverTimestamp() }));
    await assertFails(getDoc(doc(guest, 'mood_entries/student-mood')));
    await assertSucceeds(deleteDoc(doc(student, 'mood_entries/student-mood')));
    await assertSucceeds(setDoc(doc(student, 'chat_threads/student-a'), { studentId: 'student-a', counselorId: 'counselor-a', createdAt: serverTimestamp(), lastMessage: '', lastMessageAt: null }));
    const studentBatch = writeBatch(student);
    studentBatch.set(doc(student, 'chat_threads/student-a/messages/message'), { senderId: 'student-a', senderRole: 'student', text: 'Normal student chat', createdAt: serverTimestamp() });
    studentBatch.update(doc(student, 'chat_threads/student-a'), { lastMessage: 'Normal student chat', lastMessageAt: serverTimestamp() });
    await assertSucceeds(studentBatch.commit());
    await assertSucceeds(getDoc(doc(counselor, 'chat_threads/student-a/messages/message')));
    await assertFails(getDoc(doc(guest, 'chat_threads/student-a/messages/message')));
    console.log('PASS: actual Firestore rules; anonymous mood CRUD/isolation; assigned counselor access; two-way real listeners; sender-only edits/deletes; forged ownership/identity denied; persistence; normal student mood/chat preserved.');
  } finally { stops.forEach(stop => stop()); await env.cleanup(); }
}
test().catch(error => { console.error(error); process.exitCode = 1; });
