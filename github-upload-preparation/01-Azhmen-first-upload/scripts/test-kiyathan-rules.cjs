// Run inside the local emulator; no production writes.
const fs = require('node:fs'), path = require('node:path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, getDocs, collection, query, where, setDoc, updateDoc, deleteDoc, serverTimestamp } = require('firebase/firestore');
async function test() {
  const env = await initializeTestEnvironment({ projectId: 'demo-mindease', firestore: { host: '127.0.0.1', port: 8089, rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8') } });
  const counselor = env.authenticatedContext('counselor-a').firestore(), other = env.authenticatedContext('counselor-b').firestore(), student = env.authenticatedContext('student-a').firestore(), guest = env.authenticatedContext('guest', { firebase: { sign_in_provider: 'anonymous' } }).firestore(), signedOut = env.unauthenticatedContext().firestore();
  try {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async ctx => {
      const db = ctx.firestore();
      for (const [uid, role] of [['counselor-a', 'counselor'], ['counselor-b', 'counselor'], ['student-a', 'student']]) await setDoc(doc(db, 'users', uid), { role });
      await setDoc(doc(db, 'appointments/session'), { counselorId: 'counselor-a', counselorName: 'Counselor', studentId: 'student-a', appointmentDate: '2030-05-20', appointmentTime: '10:30', sessionFormat: 'Virtual', status: 'booked', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      await setDoc(doc(db, 'pre_session_notes/session'), { studentId: 'student-a', appointmentId: 'session', note: 'Private note', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      await setDoc(doc(db, 'appointments/no-note'), { counselorId: 'counselor-a', studentId: 'student-a' });
    });
    const slot = { counselorId: 'counselor-a', date: '2030-05-20', startTime: '10:30', endTime: '11:30', mode: 'virtual', location: '', isAvailable: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await assertSucceeds(setDoc(doc(counselor, 'counselor_availability/own'), slot));
    await assertSucceeds(getDocs(query(collection(counselor, 'counselor_availability'), where('counselorId', '==', 'counselor-a'))));
    await assertSucceeds(getDocs(query(collection(student, 'counselor_availability'), where('isAvailable', '==', true))));
    await assertFails(getDocs(collection(student, 'counselor_availability')));
    for (const db of [other, student, guest, signedOut]) {
      await assertFails(setDoc(doc(db, 'counselor_availability/forged'), slot));
      await assertFails(updateDoc(doc(db, 'counselor_availability/own'), { isAvailable: false, updatedAt: serverTimestamp() }));
      await assertFails(deleteDoc(doc(db, 'counselor_availability/own')));
    }
    await assertFails(getDoc(doc(other, 'counselor_availability/own')));
    for (const changed of [{ counselorId: 'counselor-b' }, { createdAt: serverTimestamp() }, { endTime: '09:00' }, { startTime: '27:00' }, { mode: 'other' }, { extra: true }]) await assertFails(updateDoc(doc(counselor, 'counselor_availability/own'), { ...changed, updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(counselor, 'counselor_availability/own'), { isAvailable: false, updatedAt: serverTimestamp() }));
    await assertFails(getDoc(doc(student, 'counselor_availability/own')));
    await assertSucceeds(getDoc(doc(counselor, 'counselor_availability/own')));
    await assertSucceeds(deleteDoc(doc(counselor, 'counselor_availability/own')));
    await assertSucceeds(getDoc(doc(counselor, 'appointments/session')));
    await assertSucceeds(getDocs(query(collection(counselor, 'appointments'), where('counselorId', '==', 'counselor-a'))));
    await assertFails(getDocs(collection(counselor, 'appointments')));
    await assertSucceeds(getDoc(doc(counselor, 'pre_session_notes/session')));
    await assertSucceeds(getDoc(doc(counselor, 'pre_session_notes/no-note')));
    await assertFails(getDocs(collection(counselor, 'pre_session_notes')));
    for (const db of [other, guest, signedOut]) {
      await assertFails(getDoc(doc(db, 'appointments/session')));
      await assertFails(getDoc(doc(db, 'pre_session_notes/session')));
      await assertFails(updateDoc(doc(db, 'appointments/session'), { status: 'completed', updatedAt: serverTimestamp() }));
    }
    await assertFails(updateDoc(doc(counselor, 'pre_session_notes/session'), { note: 'Forbidden', updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(counselor, 'pre_session_notes/session')));
    await assertFails(setDoc(doc(counselor, 'pre_session_notes/no-note'), { studentId: 'student-a', appointmentId: 'no-note', note: 'Forbidden', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    for (const changed of [{ studentId: 'other' }, { counselorId: 'counselor-b' }, { appointmentTime: '12:00' }, { appointmentDate: '2030-05-21' }, { sessionFormat: 'In-Person' }, { counselorName: 'Other' }, { createdAt: serverTimestamp() }, { extra: true }, { status: 'rescheduled' }]) await assertFails(updateDoc(doc(counselor, 'appointments/session'), { status: 'completed', ...changed, updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(counselor, 'appointments/session')));
    await assertSucceeds(updateDoc(doc(counselor, 'appointments/session'), { status: 'completed', updatedAt: serverTimestamp() }));
    await assertSucceeds(getDoc(doc(student, 'appointments/session')));
    await assertFails(updateDoc(doc(counselor, 'appointments/session'), { status: 'cancelled', updatedAt: serverTimestamp() }));
    console.log('PASS: availability owner CRUD/student available-only reads, assigned session/notes reads, status-only updates, no counselor note mutation or arbitrary booking edits.');
  } finally { await env.cleanup(); }
}
test().catch(err => { console.error(err); process.exitCode = 1; });
