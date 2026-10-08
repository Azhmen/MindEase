const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, updateDoc, deleteField, serverTimestamp } = require('firebase/firestore');
async function test() {
  const env = await initializeTestEnvironment({ projectId: 'demo-mindease', firestore: { host: '127.0.0.1', port: 8089, rules: fs.readFileSync(path.join(__dirname, '../firestore.rules'), 'utf8') } });
  try {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'users', 'student-a'), { uid: 'student-a', name: 'Student', email: 'student@example.test', role: 'student', createdAt: new Date() });
      await setDoc(doc(context.firestore(), 'users', 'counselor-a'), { role: 'counselor', name: 'Counselor' });
    });
    const owner = env.authenticatedContext('student-a').firestore();
    const ref = doc(owner, 'users', 'student-a');
    await assertSucceeds(updateDoc(ref, { appointmentRemindersEnabled: true, updatedAt: serverTimestamp() }));
    await assertSucceeds(getDoc(ref));
    await assertSucceeds(updateDoc(ref, { appointmentRemindersEnabled: false, updatedAt: serverTimestamp() }));
    for (const field of ['uid', 'email', 'role', 'createdAt']) await assertFails(updateDoc(ref, { appointmentRemindersEnabled: true, [field]: 'FORGED', updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(ref, { name: 'Updated Student', faculty: 'Computing', yearOfStudy: '3', preferredName: 'Student', updatedAt: serverTimestamp() }));
    for (const fields of [{ name: ' ' }, { yearOfStudy: '9' }, { faculty: 'x'.repeat(121) }, { admin: true }]) await assertFails(updateDoc(ref, { ...fields, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref, { appointmentRemindersEnabled: 'true', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref, { appointmentRemindersEnabled: deleteField(), updatedAt: serverTimestamp() }));
    for (const db of [env.authenticatedContext('student-b').firestore(), env.authenticatedContext('guest', { firebase: { sign_in_provider: 'anonymous' } }).firestore(), env.unauthenticatedContext().firestore()]) await assertFails(updateDoc(doc(db, 'users', 'student-a'), { appointmentRemindersEnabled: true, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(env.authenticatedContext('counselor-a').firestore(), 'users', 'counselor-a'), { appointmentRemindersEnabled: true, updatedAt: serverTimestamp() }));
    console.log('PASS: deployed-style preference rules, own student setting, protected identity, foreign/anonymous/signed-out/counselor rejection.');
  } finally { await env.cleanup(); }
}
test().catch(error => { console.error(error); process.exitCode = 1; });
