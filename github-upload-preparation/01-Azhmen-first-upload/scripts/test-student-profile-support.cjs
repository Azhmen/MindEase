// Actual TypeScript services, isolated in-memory Firestore boundary. Not deployed-rule tests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const auth = { currentUser: { uid: 'student-a', isAnonymous: false } };
const rows = new Map(), cache = {};
let ids = 0, clock = 0, failCommit = false;
function ref(key) { return { key, id: key.split('/').at(-1) }; }
function snapshot(reference) { return { exists: () => rows.has(reference.key), data: () => rows.get(reference.key), id: reference.id }; }
const api = {
  collection: (base, ...parts) => ref([base.key ?? '', ...parts].filter(Boolean).join('/')),
  doc: (base, ...parts) => ref([base.key ?? '', ...(parts.length ? parts : [String(++ids)])].filter(Boolean).join('/')),
  getDoc: async reference => snapshot(reference),
  where: (field, _, value) => ({ field, value }),
  query: (reference, filter) => ({ reference, filter }),
  getDocs: async input => {
    const reference = input.reference ?? input;
    return { docs: [...rows].filter(([key, data]) => key.startsWith(reference.key + '/') && !key.slice(reference.key.length + 1).includes('/') && (!input.filter || data[input.filter.field] === input.filter.value)).map(([key]) => snapshot(ref(key))) };
  },
  serverTimestamp: () => { const value = ++clock; return { toMillis: () => value }; },
  runTransaction: async (_, callback) => {
    const pending = [];
    await callback({
      get: async reference => snapshot(reference),
      set: (reference, data) => pending.push([reference.key, data]),
      update: (reference, data) => pending.push([reference.key, { ...rows.get(reference.key), ...data }]),
      delete: reference => pending.push([reference.key, null]),
    });
    if (failCommit) { failCommit = false; throw new Error('Simulated network failure'); }
    pending.forEach(([key, data]) => data === null ? rows.delete(key) : rows.set(key, data));
  },
};
function load(name) {
  if (cache[name]) return cache[name];
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', name + '.ts'), 'utf8');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require: id => id === 'firebase/firestore' ? api : id === '@/config/firebase' ? { db: {}, auth } : load(id.replace('@/', '')),
  });
  return cache[name] = exports;
}
//
async function test() {
  const profiles = load('services/user-profile');
  const original = { uid: 'student-a', name: 'Original Student', email: 'student@example.test', role: 'student', createdAt: api.serverTimestamp(), appointmentRemindersEnabled: true };
  rows.set('users/student-a', original);
  for (const invalid of [{ name: ' ' }, { name: 'x'.repeat(101) }, { name: 'Valid', faculty: 'x'.repeat(121) }, { name: 'Valid', yearOfStudy: '9' }, { name: 'Valid', yearOfStudy: 'second' }]) await assert.rejects(profiles.updateCurrentStudentProfile(invalid, 'student-a'));
  const fields = await profiles.updateCurrentStudentProfile({ name: '  New Student  ', faculty: ' Computing ', yearOfStudy: ' 3 ', preferredName: ' New ', email: 'forged', role: 'counselor' }, 'student-a');
  assert.equal(fields.name, 'New Student'); assert.equal(fields.faculty, 'Computing'); assert.equal(fields.yearOfStudy, '3');
  const saved = rows.get('users/student-a');
  for (const field of ['uid', 'email', 'role', 'createdAt', 'appointmentRemindersEnabled']) assert.equal(saved[field], original[field]);
  assert.equal((await profiles.getUserProfile('student-a')).preferredName, 'New');
  await profiles.setAppointmentRemindersEnabled(false, 'student-a');
  assert.equal((await profiles.getUserProfile('student-a')).appointmentRemindersEnabled, false);
  await profiles.updateCurrentStudentProfile({ name: 'New Student' }, 'student-a');
  assert.equal(rows.get('users/student-a').yearOfStudy, '');
  failCommit = true;
  await assert.rejects(profiles.updateCurrentStudentProfile({ name: 'Not committed' }, 'student-a'), /network failure/);
  assert.equal(rows.get('users/student-a').name, 'New Student');
  for (const user of [null, { uid: 'guest', isAnonymous: true }, { uid: 'other', isAnonymous: false }]) { auth.currentUser = user; await assert.rejects(profiles.updateCurrentStudentProfile({ name: 'Foreign edit' }, 'student-a')); }
  auth.currentUser = { uid: 'counselor-a', isAnonymous: false }; rows.set('users/counselor-a', { role: 'counselor' });
  await assert.rejects(profiles.updateCurrentStudentProfile({ name: 'Counselor' }, 'counselor-a'), /student account/);
  const support = load('constants/student-support');
  assert.equal(support.filterStudentSupport('').length, 6);
  assert.equal(support.filterStudentSupport(' LOGIN ')[0].id, 'technical');
  assert.equal(support.filterStudentSupport('wellbeing')[0].id, 'resources');
  assert.equal(support.filterStudentSupport('', 'Urgent Help')[0].route, '/student/crisis-support');
  assert.equal(support.filterStudentSupport('no match').length, 0);
  assert.equal(support.studentGuide.length, 8); assert.equal(support.studentFaq.length, 5);
  console.log('PASS: student profile validation, trim, persistence, settings/identity preservation, failed writes, role/account isolation, support search/categories, FAQ and guide content.');
}
test().catch(error => { console.error(error); process.exitCode = 1; });

