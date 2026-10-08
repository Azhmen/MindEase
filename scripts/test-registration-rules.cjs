// Run only against the local demo Firestore emulator.
const fs = require('node:fs'), path = require('node:path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, setDoc, updateDoc, serverTimestamp } = require('firebase/firestore');
async function test() {
  const env = await initializeTestEnvironment({ projectId: 'demo-mindease', firestore: { host: '127.0.0.1', port: 8089, rules: fs.readFileSync(path.join(__dirname, '../firestore.rules'), 'utf8') } });
  try {
    await env.clearFirestore();
    for (const role of ['student', 'counselor']) {
      const uid = 'new-' + role, email = role + '@example.test';
      const db = env.authenticatedContext(uid, { email }).firestore();
      const value = { uid, name: 'New User', email, role, createdAt: serverTimestamp(), appointmentRemindersEnabled: false };
      for (const changes of [{ uid: 'other' }, { email: 'other@example.test' }, { role: 'admin' }, { admin: true }, { name: '' }, { name: '   ' }, { appointmentRemindersEnabled: true }, { password: 'secret' }]) await assertFails(setDoc(doc(db, 'users', uid), { ...value, ...changes }));
      await assertFails(setDoc(doc(db, 'users', 'other'), value));
      await assertSucceeds(setDoc(doc(db, 'users', uid), value));
      await assertFails(updateDoc(doc(db, 'users', uid), { role: role === 'student' ? 'counselor' : 'student', updatedAt: serverTimestamp() }));
      await assertFails(setDoc(doc(db, 'counselor_directory', uid), { name: 'New User', active: true }));
      await assertFails(setDoc(doc(db, 'counselor_directory', uid), { name: 'New User', active: false }));
    }
    console.log('PASS: own registration profile/default reminders, protected identity, privileged fields/password/foreign UID rejection, admin-managed directory.');
  } finally { await env.cleanup(); }
}
test().catch(error => { console.error(error); process.exitCode = 1; });
