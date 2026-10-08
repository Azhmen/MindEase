// Run inside the local Firestore emulator; never writes production data.
const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, getDocs, collection, query, where, writeBatch, setDoc, updateDoc, deleteDoc, serverTimestamp } = require('firebase/firestore');
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
      await setDoc(doc(db, 'counselor_directory/counselor-a'), { name: 'Test Counselor', active: true });
    });
    const fields = { studentId: 'student-a', counselorId: 'counselor-a', counselorName: 'Test Counselor', appointmentDate: '2030-05-20', appointmentTime: '10:30', sessionFormat: 'Virtual', status: 'booked', createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    const note = { studentId: 'student-a', appointmentId: 'booking', note: 'Support with exams', createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await assertSucceeds(getDoc(doc(student, 'appointments/booking')));
    const batch = writeBatch(student);
    batch.set(doc(student, 'appointments/booking'), fields);
    batch.set(doc(student, 'pre_session_notes/booking'), note);
    await assertSucceeds(batch.commit());
    await assertSucceeds(getDocs(query(collection(student, 'appointments'), where('studentId', '==', 'student-a'))));
    await assertFails(getDocs(collection(student, 'appointments')));
    await assertSucceeds(getDoc(doc(student, 'pre_session_notes/booking')));
    for (const db of [other, guest, signedOut]) {
      for (const collectionName of ['appointments', 'pre_session_notes']) {
        await assertFails(getDoc(doc(db, collectionName + '/booking')));
        await assertFails(updateDoc(doc(db, collectionName + '/booking'), { updatedAt: serverTimestamp() }));
        await assertFails(deleteDoc(doc(db, collectionName + '/booking')));
      }
    }
    await assertSucceeds(getDoc(doc(counselor, 'appointments/booking')));
    await assertSucceeds(getDoc(doc(counselor, 'pre_session_notes/booking')));
    await assertFails(updateDoc(doc(counselor, 'pre_session_notes/booking'), { note: 'Forbidden', updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(counselor, 'pre_session_notes/booking')));
    await assertFails(updateDoc(doc(counselor, 'appointments/booking'), { appointmentTime: '11:00', updatedAt: serverTimestamp() }));
    await assertFails(setDoc(doc(student, 'appointments/forged'), { ...fields, studentId: 'student-b' }));
    await assertFails(setDoc(doc(student, 'appointments/completed'), { ...fields, status: 'completed' }));
    await assertFails(setDoc(doc(student, 'appointments/fake-counselor'), { ...fields, counselorId: 'missing' }));
    await assertFails(setDoc(doc(student, 'pre_session_notes/orphan'), { ...note, appointmentId: 'orphan' }));
    await assertFails(setDoc(doc(other, 'pre_session_notes/booking'), { ...note, studentId: 'student-b' }));
    for (const changes of [{ studentId: 'student-b' }, { counselorId: 'missing' }, { createdAt: serverTimestamp() }, { status: 'completed' }, { extra: true }]) {
      await assertFails(updateDoc(doc(student, 'appointments/booking'), { ...changes, updatedAt: serverTimestamp() }));
    }
    await assertSucceeds(updateDoc(doc(student, 'appointments/booking'), { appointmentDate: '2030-05-21', appointmentTime: '13:00', sessionFormat: 'In-Person', status: 'rescheduled', updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(student, 'pre_session_notes/booking'), { note: 'Updated note', updatedAt: serverTimestamp() }));
    for (const changes of [{ studentId: 'student-b' }, { appointmentId: 'other' }, { createdAt: serverTimestamp() }, { note: '  ' }, { note: 'x'.repeat(2001) }]) {
      await assertFails(updateDoc(doc(student, 'pre_session_notes/booking'), { ...changes, updatedAt: serverTimestamp() }));
    }
    await assertFails(deleteDoc(doc(student, 'appointments/booking'))); // soft delete only
    await assertSucceeds(updateDoc(doc(student, 'appointments/booking'), { status: 'cancelled', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(student, 'appointments/booking'), { status: 'rescheduled', updatedAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(doc(student, 'pre_session_notes/booking')));
    await assertSucceeds(getDoc(doc(student, 'pre_session_notes/booking'))); // absent own note
    console.log('PASS: appointment/note rules; atomic confirmation; own-only reads/mutations; immutable ownership/identity; soft cancellation; note deletion; role and payload restrictions.');
  } finally { await env.cleanup(); }
}
test().catch(error => { console.error(error); process.exitCode = 1; });
