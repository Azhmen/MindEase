// Execute inside the Firestore emulator; never writes production data.
const fs = require('node:fs'), path = require('node:path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } = require('firebase/firestore');
async function test() {
  const env = await initializeTestEnvironment({ projectId: 'demo-mindease', firestore: { host: '127.0.0.1', port: 8089, rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8') } });
  const counselor = env.authenticatedContext('counselor-a').firestore(), other = env.authenticatedContext('counselor-b').firestore(), student = env.authenticatedContext('student-a').firestore();
  try {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async ctx => {
      const db = ctx.firestore();
      for (const [uid, role] of [['counselor-a', 'counselor'], ['counselor-b', 'counselor'], ['student-a', 'student']]) await setDoc(doc(db, 'users', uid), { uid, role, name: 'Original name', email: uid + '@example.test', createdAt: serverTimestamp() });
      await setDoc(doc(db, 'counselor_directory/counselor-a'), { name: 'Original name', active: false });
    });
    function save(db, privateChanges = {}, publicChanges = {}) {
      const batch = writeBatch(db);
      batch.update(doc(db, 'users/counselor-a'), { name: 'New counselor', title: 'Campus Counselor', specialization: 'Academic wellbeing', bio: 'Private bio', officeLocation: 'Office A', phoneExtension: '204', updatedAt: serverTimestamp(), ...privateChanges });
      batch.update(doc(db, 'counselor_directory/counselor-a'), { name: 'New counselor', title: 'Campus Counselor', specialization: 'Academic wellbeing', ...publicChanges });
      return batch.commit();
    }
    await assertSucceeds(save(counselor));
    await assertSucceeds(getDoc(doc(counselor, 'users/counselor-a')));
    await assertSucceeds(getDoc(doc(student, 'counselor_directory/counselor-a')));
    await assertFails(getDoc(doc(other, 'users/counselor-a')));
    await assertFails(getDoc(doc(student, 'users/counselor-a')));
    await assertFails(save(other)); await assertFails(save(student));
    for (const changes of [{ uid: 'other' }, { role: 'student' }, { email: 'forged@example.test' }, { createdAt: serverTimestamp() }, { extra: true }, { name: '   ' }, { bio: 'x'.repeat(1001) }, { title: 'x'.repeat(101) }, { phoneExtension: 123 }]) await assertFails(save(counselor, changes));
    for (const changes of [{ active: true }, { email: 'private@example.test' }, { bio: 'Private text' }, { officeLocation: 'Private office' }, { phoneExtension: '204' }, { name: 'Unsynchronized' }, { title: 'Unsynchronized' }, { specialization: 'Unsynchronized' }]) await assertFails(save(counselor, {}, changes));
    await assertFails(updateDoc(doc(counselor, 'users/counselor-a'), { name: 'Private-only change', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(counselor, 'counselor_directory/counselor-a'), { name: 'Directory-only change' }));
    await assertFails(setDoc(doc(other, 'counselor_directory/counselor-b'), { name: 'Self membership', active: true }));
    await assertFails(deleteDoc(doc(counselor, 'users/counselor-a')));
    await assertFails(deleteDoc(doc(counselor, 'counselor_directory/counselor-a')));
    const saved = (await getDoc(doc(counselor, 'users/counselor-a'))).data(), publicData = (await getDoc(doc(counselor, 'counselor_directory/counselor-a'))).data();
    if (saved.role !== 'counselor' || saved.email !== 'counselor-a@example.test' || publicData.active !== false || 'bio' in publicData) throw new Error('Identity/active/private field preservation failed');
    await assertSucceeds(updateDoc(doc(counselor, 'users/counselor-a'), { bio: '', officeLocation: '', phoneExtension: '', updatedAt: serverTimestamp() }));
    console.log('PASS: counselor own editable fields, atomic public synchronization, identity/active/privacy restrictions and cross-account denials.');
  } finally { await env.cleanup(); }
}
test().catch(error => { console.error(error); process.exitCode = 1; });
