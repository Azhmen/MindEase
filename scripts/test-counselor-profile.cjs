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
async function test() {
  const profiles = load('services/user-profile');
  const appointments = load('services/appointments');
  rows.set('users/student-a', { role: 'student' });
  const before = { uid: 'counselor-a', name: 'Original Counselor', email: 'counselor@example.test', role: 'counselor', createdAt: api.serverTimestamp() };
  const directory = { name: before.name, title: 'Old title', active: false, specialty: 'Legacy public specialty' };
  rows.set('users/counselor-a', before); rows.set('counselor_directory/counselor-a', directory);
  rows.set('users/counselor-b', { uid: 'counselor-b', role: 'counselor', name: 'Other', email: 'other@example.test', createdAt: api.serverTimestamp() });
  auth.currentUser = { uid: 'counselor-a', isAnonymous: false };
  assert.equal((await profiles.getCurrentCounselorProfile()).name, before.name);
  for (const invalid of [{ name: '   ' }, { name: 'x'.repeat(101) }, { name: 'Valid', bio: 'x'.repeat(1001) }, { name: 'Valid', title: 'x'.repeat(101) }]) await assert.rejects(profiles.updateCurrentCounselorProfile(invalid));
  const input = { name: '  Updated Counselor  ', title: '  Campus Counselor  ', specialization: '  Academic wellbeing  ', bio: '  Original biography  ', officeLocation: '  Office A  ', phoneExtension: '  204  ', uid: 'forged', role: 'student', email: 'forged@example.test', active: true };
  failCommit = true;
  await assert.rejects(profiles.updateCurrentCounselorProfile(input), /network failure/);
  assert.equal(rows.get('users/counselor-a'), before); assert.equal(rows.get('counselor_directory/counselor-a'), directory, 'Atomic failure preserves both documents');
  const fields = await profiles.updateCurrentCounselorProfile(input);
  const saved = rows.get('users/counselor-a'), publicData = rows.get('counselor_directory/counselor-a');
  assert.equal(saved.name, 'Updated Counselor'); assert.equal(saved.title, 'Campus Counselor');
  assert.equal(saved.bio, 'Original biography'); assert.equal(saved.officeLocation, 'Office A'); assert.equal(saved.phoneExtension, '204');
  for (const key of ['uid', 'email', 'role', 'createdAt']) assert.equal(saved[key], before[key]);
  assert.equal(publicData.name, saved.name); assert.equal(publicData.title, saved.title); assert.equal(publicData.specialization, saved.specialization);
  assert.equal(publicData.active, false, 'Inactive remains inactive'); assert.equal(publicData.specialty, directory.specialty);
  for (const privateKey of ['email', 'bio', 'officeLocation', 'phoneExtension', 'updatedAt', 'uid', 'role']) assert.ok(!(privateKey in publicData));
  assert.equal(Object.keys(fields).sort().join(','), 'bio,name,officeLocation,phoneExtension,specialization,title');
  delete cache['services/user-profile'];
  assert.equal((await load('services/user-profile').getCurrentCounselorProfile()).bio, saved.bio, 'Reload persists');
  rows.set('counselor_directory/counselor-a', { ...publicData, active: true });
  auth.currentUser = { uid: 'student-a' };
  const picker = await appointments.getBookingCounselors();
  assert.equal(picker[0].name, saved.name); assert.equal(picker[0].title, saved.title, 'Student picker uses synchronized public values');
  await assert.rejects(profiles.updateCurrentCounselorProfile({ name: 'Student edit' }), /counselor account/);
  auth.currentUser = { uid: 'counselor-b' };
  await assert.rejects(profiles.updateCurrentCounselorProfile({ name: 'Stale draft' }, 'counselor-a'), /account changed/);
  await assert.rejects(profiles.updateCurrentCounselorProfile({ name: 'Other update' }), /directory entry is missing/);
  assert.equal(rows.get('users/counselor-a'), saved, 'Other counselor API cannot target first counselor');
  auth.currentUser = { uid: 'counselor-a' };
  rows.set('counselor_directory/counselor-a', { name: saved.name });
  await profiles.updateCurrentCounselorProfile({ name: 'Name only' });
  assert.ok(!('active' in rows.get('counselor_directory/counselor-a')), 'Omitted active stays omitted');
  assert.equal(rows.get('users/counselor-a').bio, '', 'Optional fields may be cleared');
  for (const user of [null, { uid: 'guest', isAnonymous: true }]) { auth.currentUser = user; await assert.rejects(profiles.getCurrentCounselorProfile(), /counselor account/); }
  console.log('PASS: profile read/edit/trim/validation/reload, atomic directory sync, identity/privacy/active preservation, optional fields, picker integration and role/account isolation.');
}
test().catch(error => { console.error(error); process.exitCode = 1; });
